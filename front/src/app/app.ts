import "../styles/styles.scss";
import { ActionType, UserInputAction, UserInput, LogInAction,
         RespawnAction, InputState } from "./common/action";
import { GameResponse, GameResponseType, RGameState, RError, RNewEntities,
         RLoginSuccess, REntitiesDeleted, REvent, RNewPlayerId, RMapData,
         ClientMapData } from "./common/response";
import { constructEntities,
         constructInitialEntitiesFromMapData } from './factory';
import { CLIENT_FRAME_RATE } from "./common/constants";
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
import { ClientSpatialComponent } from './client_spatial_component';
import { UserInputManager } from "./user_input_manager";
import { EWindowResized, GameEventType } from "./common/event";

declare var __WEBSOCKET_URL__: string;

const PLAYER_ID_UNSET = -1;
const PLAYER_ID_DEAD = -2;

export class App {
  private _ws: WebSocket;
  private _responseQueue: GameResponse[] = [];
  private _actionQueue: UserInputAction[] = [];
  private _em: ClientEntityManager;
  private _scheduler: Scheduler;
  private _playerId: EntityId = PLAYER_ID_UNSET;
  private _mapData: ClientMapData|null = null;
  private _userInputManager: UserInputManager;

  constructor() {
    window.onresize = this._onWindowResize.bind(this);

    this._ws = new WebSocket(__WEBSOCKET_URL__);
    this._ws.onmessage = ev => this._onServerMessage(ev);

    this._scheduler = new Scheduler();

    this._em = new ClientEntityManager();
    const spatialSystem = new ClientSpatialSystem(CLIENT_FRAME_RATE);
    const renderSystem = new RenderSystem(this._em,
                                          this._scheduler,
                                          this._tick.bind(this));
    const behaviourSystem = new BehaviourSystem();
    const adSystem = new ClientAdSystem(this._em, this._scheduler);
    this._em.addSystem(ComponentType.SPATIAL, spatialSystem);
    this._em.addSystem(ComponentType.RENDER, renderSystem);
    this._em.addSystem(ComponentType.BEHAVIOUR, behaviourSystem);
    this._em.addSystem(ComponentType.AD, adSystem);

    this._userInputManager
      = new UserInputManager(this._em,
                             this._scheduler,
                             this._onDirectionKeyDown.bind(this),
                             this._onDirectionKeyUp.bind(this),
                             this._onEnterKeyPress.bind(this));

    this._insertElement();
  }

  async start() {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    await renderSys.init();

    this._userInputManager.initialiseUi();

    await waitForCondition(() => this._ws.readyState === WebSocket.OPEN,
                           500,
                           10);

    // TODO
    this._logIn();
  }

  private _onEnterKeyPress() {
    if (this._playerId == PLAYER_ID_DEAD) {
      this._requestRespawn();
    }
  }

  private _onDirectionKeyDown(input: UserInput) {
    if (this._playerId == PLAYER_ID_UNSET) {
      return;
    }

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

  private _onDirectionKeyUp(input: UserInput) {
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
    this._centreStage();
  }

  private _onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const event: EWindowResized = {
      type: GameEventType.WINDOW_RESIZED,
      entities: [],
      w,
      h
    }

    this._em.postEvent(event);
  }

  private _centreStage() {
    if (this._playerId >= 0) {
      const player =
        <ClientSpatialComponent>this._em.getComponent(ComponentType.SPATIAL,
                                                      this._playerId);

      const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
      renderSys.setCameraPosition(player.x, player.y);
    }
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
    // TODO
    const email = "fragzbro123@email.com";
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

  private _initialiseGame(mapData: ClientMapData) {
    this._onWindowResize();
    constructInitialEntitiesFromMapData(this._em, mapData);
  }

  private _handleServerMessage(msg: GameResponse) {
    switch (msg.type) {
      case GameResponseType.MAP_DATA:{
        const m = <RMapData>msg;
        this._mapData = m.mapData;
        this._initialiseGame(this._mapData);
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
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    parentElement.appendChild(renderSys.getCanvas());
  }
}
