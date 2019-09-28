import * as PIXI from 'pixi.js';
import "../styles/styles.scss";
import { ActionType, MoveAction } from "./common/action";
import { GameResponse, GameResponseType, RGameState, RError, RNewEntities,
         RLoginSuccess, REntitiesDeleted } from "./common/response";
import { EntityManager, EntityId } from './common/entity_manager';
import { constructEntities } from './factory';
import { SpatialSystem } from './common/spatial_system';
import { WORLD_W, WORLD_H, BLOCK_SZ, CLIENT_FRAME_RATE, FRAMES_PER_BLOCK,
         SERVER_FRAME_RATE} from "./common/config";
import { RenderSystem } from './render_system';
import { ComponentType } from './common/component_types';
import { AgentSystem } from './common/agent_system';
import { ResourcesMap } from './definitions';
import { debounce } from './common/utils';
import { Direction } from './common/definitions';

const WEBSOCKET_URL = "ws://localhost:3001";

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

class App {
  private _pixi: PIXI.Application;
  private _resources: ResourcesMap = {};
  private _ws: WebSocket;
  private _responseQueue: GameResponse[] = [];
  private _em: EntityManager;
  private _userInput: UserInput;
  private _playerId: EntityId = -1;
  private _movePlayerFn: (direction: Direction) => void|null;

  constructor() {
    this._pixi = new PIXI.Application();
    const renderer = this._pixi.renderer;
    this._pixi.stage.position.y = renderer.height / renderer.resolution;
    this._pixi.stage.scale.y = -1;

    this._ws = new WebSocket(WEBSOCKET_URL);

    this._ws.onmessage = ev => this._onServerMessage(ev);

    this._em = new EntityManager();
    const spatialSystem = new SpatialSystem(this._em,
                                            WORLD_W,
                                            WORLD_H,
                                            CLIENT_FRAME_RATE);
    const renderSystem = new RenderSystem(this._em, this._pixi);
    const agentSystem = new AgentSystem();
    this._em.addSystem(ComponentType.SPATIAL, spatialSystem);
    this._em.addSystem(ComponentType.RENDER, renderSystem);
    this._em.addSystem(ComponentType.AGENT, agentSystem);

    const t = 1000 * FRAMES_PER_BLOCK / SERVER_FRAME_RATE;
    this._movePlayerFn = debounce(this, this._movePlayer, t);

    this._userInput = new UserInput();

    this._insertElement();

    this._pixi.ticker.maxFPS = CLIENT_FRAME_RATE;
    this._pixi.ticker.add(delta => this._tick(delta));
  }

  private _tick(delta: number) {
    this._handleServerMessages();
    this._keyboard();
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
      this._movePlayerFn(direction);
    }
  }

  _movePlayer(direction: Direction) {
    const spatialSys = <SpatialSystem>this._em.getSystem(ComponentType.SPATIAL);

    // Start moving at half speed
    //

    const t = 2.0 * FRAMES_PER_BLOCK / SERVER_FRAME_RATE;

    switch (direction) {
      case Direction.UP:
        spatialSys.moveEntity_tween(this._playerId, 0, BLOCK_SZ, t);
        break;
      case Direction.RIGHT:
        spatialSys.moveEntity_tween(this._playerId, BLOCK_SZ, 0, t);
        break;
      case Direction.DOWN:
        spatialSys.moveEntity_tween(this._playerId, 0, -BLOCK_SZ, t);
        break;
      case Direction.LEFT:
        spatialSys.moveEntity_tween(this._playerId, -BLOCK_SZ, 0, t);
        break;
    }

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

  private _deleteEntities(response: REntitiesDeleted) {
    response.entities.forEach(entity => {
      this._em.removeEntity(entity.id);
    });
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
      case GameResponseType.LOGIN_SUCCESS:
        const m = <RLoginSuccess>msg;
        this._startGame(m.playerId);
        break;
      case GameResponseType.ERROR:
        this._handleServerError(<RError>msg);
        break;
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
