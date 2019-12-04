import * as PIXI from 'pixi.js';
import "../styles/styles.scss";
import { ActionType, UserInputAction, UserInput, LogInAction,
         RespawnAction, InputState } from "./common/action";
import { GameResponse, GameResponseType, RGameState, RError, RNewEntities,
         RLoginSuccess, REntitiesDeleted, REvent, RNewPlayerId, RMapData,
         ClientMapData } from "./common/response";
import { constructEntities, initialiseGame } from './factory';
import { CLIENT_FRAME_RATE, BLOCK_SZ, WORLD_W,
         WORLD_H } from "./common/constants";
import { RenderSystem } from './render_system';
import { ComponentType } from './common/component_types';
import { waitForCondition } from './common/utils';
import { ClientEntityManager } from './client_entity_manager';
import { EntityId } from './common/system';
import { ClientSpatialSystem } from './client_spatial_system';
import { GameError } from './common/error';
import { Scheduler } from './scheduler';
import { BehaviourSystem } from './common/behaviour_system';
import { ClientAdSystem } from './client_ad_system';

declare var __WEBSOCKET_URL__: string;

const PLAYER_ID_UNSET = -1;
const PLAYER_ID_DEAD = -2;

function keyEventToUserInput(event: KeyboardEvent): UserInput|null {
  switch (event.key) {
    case "ArrowUp": return UserInput.UP;
    case "ArrowRight": return UserInput.RIGHT;
    case "ArrowDown": return UserInput.DOWN;
    case "ArrowLeft": return UserInput.LEFT;
  }
  return null;
}

export class App {
  private _pixi: PIXI.Application;
  private _ws: WebSocket;
  private _responseQueue: GameResponse[] = [];
  private _actionQueue: UserInputAction[] = [];
  private _em: ClientEntityManager;
  private _scheduler: Scheduler;
  private _playerId: EntityId = PLAYER_ID_UNSET;
  private _mapData: ClientMapData|null = null;

  constructor() {
    this._pixi = new PIXI.Application({
      width: WORLD_W * BLOCK_SZ,
      height: WORLD_H * BLOCK_SZ
    });

    this._ws = new WebSocket(__WEBSOCKET_URL__);
    this._ws.onmessage = ev => this._onServerMessage(ev);

    this._scheduler = new Scheduler();

    this._em = new ClientEntityManager();
    const spatialSystem = new ClientSpatialSystem(CLIENT_FRAME_RATE);
    const renderSystem = new RenderSystem(this._em,
                                          this._scheduler,
                                          this._pixi);
    const behaviourSystem = new BehaviourSystem();
    const adSystem = new ClientAdSystem(this._em, this._scheduler);
    this._em.addSystem(ComponentType.SPATIAL, spatialSystem);
    this._em.addSystem(ComponentType.RENDER, renderSystem);
    this._em.addSystem(ComponentType.BEHAVIOUR, behaviourSystem);
    this._em.addSystem(ComponentType.AD, adSystem);

    window.addEventListener("keydown", event => this._onKeyDown(event), false);
    window.addEventListener("keyup", event => this._onKeyUp(event), false);

    this._insertElement();
  }

  async start() {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    await renderSys.init();

    await waitForCondition(() => this._ws.readyState === WebSocket.OPEN,
                           500,
                           10);

    // TODO
    this._logIn();

    this._pixi.ticker.maxFPS = CLIENT_FRAME_RATE;
    this._pixi.ticker.add(delta => this._tick(delta));
  }

  private _onKeyDown(event: KeyboardEvent) {
    if (this._playerId == PLAYER_ID_UNSET) {
      return;
    }

    if (this._playerId == PLAYER_ID_DEAD && event.key == "Enter") {
      this._requestRespawn();
      return;
    }

    const input = keyEventToUserInput(event);
    if (input !== null) {
      const action: UserInputAction = {
        type: ActionType.USER_INPUT,
        playerId: this._playerId,
        input,
        state: InputState.PRESSED
      };

      this._actionQueue.push(action);
    }
  }

  private _onKeyUp(event: KeyboardEvent) {
    const input = keyEventToUserInput(event);
    if (input !== null) {
      const action: UserInputAction = {
        type: ActionType.USER_INPUT,
        playerId: this._playerId,
        input,
        state: InputState.RELEASED
      };

      this._actionQueue.push(action);
    }
  }

  private _tick(delta: number) {
    this._handleServerMessages();
    this._processUserActions();
    this._scheduler.update();
    this._em.update();
  }

  private _processUserActions() {
    this._actionQueue.forEach(action => {
      if (this._playerId != PLAYER_ID_DEAD) {
        const dataString = JSON.stringify(action);
        this._ws.send(dataString);
      }
    });

    this._actionQueue = [];
  }

  private _logIn() {
    const email = "gamer1@email.com";
    const password = "password";

    const data: LogInAction = {
      playerId: PLAYER_ID_UNSET,
      type: ActionType.LOG_IN,
      email,
      password
    };

    const dataString = JSON.stringify(data);

    this._ws.send(dataString);
  }

  private _requestRespawn() {
    const action: RespawnAction = {
      type: ActionType.RESPAWN,
      playerId: PLAYER_ID_UNSET
    };

    const dataString = JSON.stringify(action);
    this._ws.send(dataString);
  }

  private _startGame(playerId: EntityId) {
    // TODO
    console.log("Starting game");
    this._playerId = playerId;
  }

  private _updateGameState(response: RGameState) {
    response.packets.forEach(packet => {
      this._em.updateComponent(packet);
    });
  }

  private _handleServerError(response: RError) {
    // TODO
    console.log("Received error from server: " + response.message);
  }

  private _deleteEntities(response: REntitiesDeleted) {
    response.entities.forEach(entity => {
      this._em.removeEntity(entity.id);
    });
  }

  private _onPlayerKilled() {
    console.log("You died!");
    this._playerId = PLAYER_ID_DEAD;
  }

  private _handleServerMessage(msg: GameResponse) {
    switch (msg.type) {
      case GameResponseType.MAP_DATA:{
        const m = <RMapData>msg;
        this._mapData = m.mapData;
        initialiseGame(this._em, this._mapData);
        break;
      }
      case GameResponseType.NEW_ENTITIES: {
        if (!this._mapData) {
          throw new GameError("Received NEW_ENTITIES response before MAP_DATA");
        }
        constructEntities(this._em, this._mapData, <RNewEntities>msg);
        break;
      }
      case GameResponseType.ENTITIES_DELETED: {
        this._deleteEntities(<REntitiesDeleted>msg);
        break;
      }
      case GameResponseType.GAME_STATE: {
        this._updateGameState(<RGameState>msg);
        break;
      }
      case GameResponseType.EVENT: {
        this._em.postEvent((<REvent>msg).event);
        break;
      }
      case GameResponseType.LOGIN_SUCCESS: {
        const m = <RLoginSuccess>msg;
        this._startGame(m.playerId);
        break;
      }
      case GameResponseType.PLAYER_KILLED: {
        this._onPlayerKilled();
        break;
      }
      case GameResponseType.NEW_PLAYER_ID: {
        const m = <RNewPlayerId>msg;
        this._startGame(m.playerId);
        break;
      }
      case GameResponseType.ERROR: {
        this._handleServerError(<RError>msg);
        break;
      }
      // ...
    }
  }

  private _handleServerMessages() {
    while (this._responseQueue.length > 0) {
      const msg = <GameResponse>this._responseQueue.shift();
      this._handleServerMessage(msg);
    }
  }

  private _onServerMessage(event: MessageEvent) {
    const msg = <GameResponse>JSON.parse(event.data);
    this._responseQueue.push(msg);
  }

  private _insertElement() {
    const parentElement = document.getElementById("pinata-demo-app");
    if (!parentElement) {
      throw new Error("Could not find #pinata-demo-app");
    }
    parentElement.appendChild(this._pixi.view);
  }
}