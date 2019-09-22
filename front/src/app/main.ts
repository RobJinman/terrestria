import * as PIXI from 'pixi.js';
import "../styles/styles.scss";
import { ActionType, MoveAction, Direction } from "./common/action";
import { GameResponse, GameResponseType, RGameState, RError,
         RNewEntity, RLoginSuccess} from "./common/response";
import { EntityManager, EntityId } from './common/entity_manager';
import { constructEntities } from './factory';
import { SpatialSystem } from './common/spatial_system';
import { WORLD_W, WORLD_H } from "./common/config";
import { RenderSystem } from './render_system';
import { ComponentType } from './common/component_types';
import { AgentSystem } from './common/agent_system';
import { ResourcesMap } from './definitions';

const WEBSOCKET_URL = "ws://localhost:3001";

type KeyboardHandlerFn = () => void;

class UserInput {
  _keyDownHandlers: Map<string, KeyboardHandlerFn>;
  _keyUpHandlers: Map<string, KeyboardHandlerFn>;

  constructor() {
    this._keyDownHandlers = new Map<string, KeyboardHandlerFn>();
    this._keyUpHandlers = new Map<string, KeyboardHandlerFn>();

    window.addEventListener("keydown", event => this._onKeyDown(event), false);
    window.addEventListener("keyup", event => this._onKeyUp(event), false);
  }

  onKeyUp(key: string, handler: KeyboardHandlerFn) {
    this._keyUpHandlers.set(key, handler);
  }

  onKeyDown(key: string, handler: KeyboardHandlerFn) {
    this._keyDownHandlers.set(key, handler);
  }

  private _onKeyDown(event: KeyboardEvent) {
    const handler = this._keyDownHandlers.get(event.key);
    if (handler) {
      handler();
    }
  }

  private _onKeyUp(event: KeyboardEvent) {
    const handler = this._keyUpHandlers.get(event.key);
    if (handler) {
      handler();
    }
  }
}

class App {
  private _pixi: PIXI.Application;
  private _resources: ResourcesMap = {};
  private _ws: WebSocket;
  private _em: EntityManager;
  private _userInput: UserInput;
  private _playerId: EntityId = 0;

  constructor() {
    this._pixi = new PIXI.Application();
    const renderer = this._pixi.renderer;
    this._pixi.stage.position.y = renderer.height / renderer.resolution;
    this._pixi.stage.scale.y = -1;

    this._ws = new WebSocket(WEBSOCKET_URL);

    this._ws.onmessage = ev => this._onServerMessage(ev);

    this._em = new EntityManager();
    const spatialSystem = new SpatialSystem(this._em, WORLD_W, WORLD_H);
    const renderSystem = new RenderSystem(this._em, this._pixi);
    const agentSystem = new AgentSystem();
    this._em.addSystem(ComponentType.SPATIAL, spatialSystem);
    this._em.addSystem(ComponentType.RENDER, renderSystem);
    this._em.addSystem(ComponentType.AGENT, agentSystem);

    this._userInput = new UserInput();
    this._userInput.onKeyDown("ArrowUp", () => this._onArrowKey(Direction.UP));
    this._userInput.onKeyDown("ArrowRight",
                              () => this._onArrowKey(Direction.RIGHT));
    this._userInput.onKeyDown("ArrowDown",
                              () => this._onArrowKey(Direction.DOWN));
    this._userInput.onKeyDown("ArrowLeft",
                              () => this._onArrowKey(Direction.LEFT));

    this._insertElement();
  }

  private _onArrowKey(direction: Direction) {
    console.log("Moving " + direction);

    const data: MoveAction = {
      type: ActionType.MOVE,
      playerId: this._playerId,
      direction
    };

    const dataString = JSON.stringify(data);
    this._ws.send(dataString);
  }

  _logIn() {
    const email = "gamer1@email.com";
    const password = "password";

    const data = {
      type: ActionType.LOG_IN,
      email,
      password
    };

    const dataString = JSON.stringify(data);
    this._ws.send(dataString);
  }

  async start() {
    this._resources = await this._loadAssets();
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    renderSys.setResources(this._resources);

    // TODO
    this._logIn();
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

  private _onServerMessage(event: MessageEvent) {
    const msg = <GameResponse>JSON.parse(event.data);
    console.log(msg);
    switch (msg.type) {
      case GameResponseType.NEW_ENTITIES:
        constructEntities(this._em, <RNewEntity>msg);
        break;
      case GameResponseType.GAME_STATE:
        this._updateGameState(<RGameState>msg);
        break;
      case GameResponseType.LOGIN_SUCCESS:
        const m = <RLoginSuccess>msg;
        this._startGame(m.playerId);
        break;
      case GameResponseType.ERROR:
        this._handleServerError(<RError>msg);
        break;
    }
  }

  private _insertElement() {
    const parentElement = document.getElementById("pinata-demo-app");
    if (!parentElement) {
      throw new Error("Could not find #pinata-demo-app");
    }
    parentElement.appendChild(this._pixi.view);
  }

  private _loadAssets(): Promise<ResourcesMap> {
    return new Promise((resolve, reject) => {
      this._pixi.loader.add("man", "assets/man.png")
                       .add("gem", "assets/gem.png")
                       .add("rock", "assets/rock.png")
                       .add("soil", "assets/soil.png")
                       .load((loader, resources) => resolve(resources));
    });
  }
}

async function init() {
  const app = new App();
  await app.start();
}

document.body.onload = init;
