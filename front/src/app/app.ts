import * as PIXI from 'pixi.js';
import "../styles/styles.scss";
import { ActionType, MoveAction, LogInAction } from "./common/action";
import { GameResponse, GameResponseType, RGameState, RError, RNewEntities,
         RLoginSuccess, REntitiesDeleted, REvent } from "./common/response";
import { constructEntities } from './factory';
import { WORLD_W, WORLD_H, CLIENT_FRAME_RATE,
         PLAYER_SPEED } from "./common/config";
import { RenderSystem } from './render_system';
import { ComponentType } from './common/component_types';
import { debounce, waitForCondition } from './common/utils';
import { Direction } from './common/definitions';
import { ClientEntityManager } from './client_entity_manager';
import { EntityId } from './common/system';
import { ClientSpatialSystem } from './client_spatial_system';
import { GameError } from './common/error';
import { GameEventType, EAgentAction, AgentActionType } from './common/event';
import { Scheduler } from './scheduler';
import { BehaviourSystem } from './common/behaviour_system';

const WEBSOCKET_URL = "ws://192.168.0.125:3001";

class UserInput {
  _keyStates: Map<string, boolean>;

  constructor() {
    this._keyStates = new Map<string, boolean>();

    window.addEventListener("keydown", event => this._onKeyDown(event), false);
    window.addEventListener("keyup", event => this._onKeyUp(event), false);
  }

  keyPressed(key: string): boolean {
    return this._keyStates.get(key) === true;
  }

  private _onKeyDown(event: KeyboardEvent) {
    this._keyStates.set(event.key, true);
  }

  private _onKeyUp(event: KeyboardEvent) {
    this._keyStates.set(event.key, false);
  }
}

function directionToLetter(direction: Direction): string {
  switch (direction) {
    case Direction.UP: return "u";
    case Direction.RIGHT: return "r";
    case Direction.DOWN: return "d";
    case Direction.LEFT: return "l";
  }
  return "";
}

export class App {
  private _pixi: PIXI.Application;
  private _ws: WebSocket;
  private _responseQueue: GameResponse[] = [];
  private _em: ClientEntityManager;
  private _scheduler: Scheduler;
  private _userInput: UserInput;
  private _playerId: EntityId = -1;
  private _moveRemoteFn: (direction: Direction) => void;

  constructor() {
    this._pixi = new PIXI.Application();
    const renderer = this._pixi.renderer;
    this._pixi.stage.position.y = renderer.height / renderer.resolution;
    this._pixi.stage.scale.y = -1;

    this._ws = new WebSocket(WEBSOCKET_URL);

    this._ws.onmessage = ev => this._onServerMessage(ev);

    this._scheduler = new Scheduler();

    this._em = new ClientEntityManager();
    const spatialSystem = new ClientSpatialSystem(this._em,
                                            WORLD_W,
                                            WORLD_H,
                                            CLIENT_FRAME_RATE);
    const renderSystem = new RenderSystem(this._em,
                                          this._scheduler,
                                          this._pixi);
    const behaviourSystem = new BehaviourSystem();
    this._em.addSystem(ComponentType.SPATIAL, spatialSystem);
    this._em.addSystem(ComponentType.RENDER, renderSystem);
    this._em.addSystem(ComponentType.BEHAVIOUR, behaviourSystem);

    const t = 0.85 * 1000 / PLAYER_SPEED;
    this._moveRemoteFn = debounce(this, this._movePlayerRemote, t);

    this._userInput = new UserInput();

    this._insertElement();
  }

  private _movePlayerRemote(direction: Direction) {
    const action: MoveAction = {
      playerId: -1,
      type: ActionType.MOVE,
      direction
    };

    const dataString = JSON.stringify(action);
    this._ws.send(dataString);

    return true;
  }

  private _tick(delta: number) {
    this._handleServerMessages();
    this._keyboard();
    this._scheduler.update();
    this._em.update();
  }

  private _keyboard() {
    if (this._playerId == -1) {
      return;
    }

    let direction: Direction|null = null;

    if (this._userInput.keyPressed("ArrowUp")) {
      direction = Direction.UP;
    }
    else if (this._userInput.keyPressed("ArrowRight")) {
      direction = Direction.RIGHT;
    }
    else if (this._userInput.keyPressed("ArrowDown")) {
      direction = Direction.DOWN;
    }
    else if (this._userInput.keyPressed("ArrowLeft")) {
      direction = Direction.LEFT;
    }

    if (direction !== null) {
      this._moveRemoteFn(direction);
    }
  }

  _logIn() {
    const email = "gamer1@email.com";
    const password = "password";

    const data: LogInAction = {
      playerId: -1,
      type: ActionType.LOG_IN,
      email,
      password
    };

    const dataString = JSON.stringify(data);

    this._ws.send(dataString);
  }

  async start() {
    const resources = await this._loadAssets();
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);

    const resource = resources["sprite_sheet"];
    if (!resource || !resource.spritesheet) {
      throw new GameError("Sprite sheet not loaded");
    }
    const sheet = resource.spritesheet;
    renderSys.setSpriteSheet(sheet);

    await waitForCondition(() => this._ws.readyState === WebSocket.OPEN,
                           500,
                           10);

    // TODO
    this._logIn();

    this._pixi.ticker.maxFPS = CLIENT_FRAME_RATE;
    this._pixi.ticker.add(delta => this._tick(delta));
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

  private _handleAgentAction(event: EAgentAction) {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);

    const dirChar = directionToLetter(event.direction);

    switch (event.actionType) {
      case AgentActionType.PUSH:
        renderSys.playAnimation(event.agentId, "man_push_" + dirChar);
        break;
      case AgentActionType.DIG:
        renderSys.playAnimation(event.agentId, "man_dig_" + dirChar);
        break;
      case AgentActionType.RUN:
        renderSys.playAnimation(event.agentId, "man_run_" + dirChar);
        break;
      // ...
    }
  }

  private _handleGameEvent(response: REvent) {
    const event = response.event;
    switch (event.type) {
      case GameEventType.AGENT_ACTION:
        this._handleAgentAction(<EAgentAction>event);
        break;
      // ...
    }

    this._em.postEvent(event);
  }

  private _handleServerMessage(msg: GameResponse) {
    switch (msg.type) {
      case GameResponseType.NEW_ENTITIES:
        constructEntities(this._em, <RNewEntities>msg);
        break;
      case GameResponseType.ENTITIES_DELETED:
        this._deleteEntities(<REntitiesDeleted>msg);
        break;
      case GameResponseType.GAME_STATE:
        this._updateGameState(<RGameState>msg);
        break;
      case GameResponseType.EVENT:
        this._handleGameEvent(<REvent>msg);
        break;
      case GameResponseType.LOGIN_SUCCESS:
        const m = <RLoginSuccess>msg;
        this._startGame(m.playerId);
        break;
      case GameResponseType.ERROR:
        this._handleServerError(<RError>msg);
        break;
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

  private _loadAssets(): Promise<Partial<Record<string, PIXI.LoaderResource>>> {
    return new Promise((resolve, reject) => {
      this._pixi.loader.add("sprite_sheet", "assets/sprite_sheet.json")
                       .load((loader, resources) => resolve(resources));
    });
  }
}