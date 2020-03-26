import "../styles/styles.scss";
import { ActionType, UserInputAction, UserInput, LogInAction,
         RespawnAction, InputState, JoinGameAction,
         SignUpAction } from "./common/action";
import { GameResponse, GameResponseType, RGameState, RError, RNewEntities,
         RLogInSuccess, REntitiesDeleted, REvent, RNewPlayerId, RMapData,
         ClientMapData, RJoinGameSuccess,
         RSignUpFailure } from "./common/response";
import { constructEntities,
         constructInitialEntitiesFromMapData } from './factory';
import { CLIENT_FRAME_RATE, BLOCK_SZ } from "./common/constants";
import { RenderSystem } from './render_system';
import { ComponentType } from './common/component_types';
import { waitForCondition } from './common/utils';
import { EntityManager } from './entity_manager';
import { EntityId } from './common/system';
import { SpatialSystem } from './spatial_system';
import { GameError, ErrorCode } from './common/error';
import { Scheduler } from './scheduler';
import { BehaviourSystem } from './common/behaviour_system';
import { AdvertSystem } from './advert_system';
import { CSpatial } from './spatial_component';
import { UserInputManager } from "./user_input_manager";
import { EWindowResized, GameEventType } from "./common/event";
import { GameState } from "./definitions";

declare var __WEBSOCKET_URL__: string;

const PLAYER_ID_UNSET = -1;
const PLAYER_ID_DEAD = -2;

type PromiseResolver<T> = (value: T) => void;
type PromiseRejector = (reason?: any) => void;

type ServerResponseHandlerFn<T> = (msg: GameResponse,
                                   resolve: PromiseResolver<T>,
                                   reject: PromiseRejector) => boolean;

type ServerResponseHandler<T> = {
  handlerFn: ServerResponseHandlerFn<T>;
  resolve: PromiseResolver<T>;
  reject: PromiseRejector;
}

export interface PinataCredentials {
  username: string;
  pinataId: string;
  pinataToken: string;
}

export class App {
  private _ws?: WebSocket;
  private _responseQueue: GameResponse[] = [];
  private _actionQueue: UserInputAction[] = [];
  private _em: EntityManager;
  private _scheduler: Scheduler;
  private _playerId: EntityId = PLAYER_ID_UNSET;
  private _mapData?: ClientMapData;
  private _userInputManager: UserInputManager;
  private _onStateChange: (state: GameState) => void;
  private _pinataId?: string;
  private _pinataToken?: string;
  private _username?: string;
  private _gameState: GameState = GameState.GAME_INACTIVE;
  private _serverResponseHandlers: ServerResponseHandler<any>[] = [];

  constructor(onStateChange: (state: GameState) => void) {
    window.onresize = this._onWindowResize.bind(this);

    this._onStateChange = onStateChange;

    this._scheduler = new Scheduler();

    this._em = new EntityManager();
    const spatialSystem = new SpatialSystem(CLIENT_FRAME_RATE);
    const renderSystem = new RenderSystem(this._em,
                                          this._scheduler,
                                          this._tick.bind(this));
    const behaviourSystem = new BehaviourSystem();
    const adSystem = new AdvertSystem(this._em, this._scheduler);
    this._em.addSystem(ComponentType.SPATIAL, spatialSystem);
    this._em.addSystem(ComponentType.RENDER, renderSystem);
    this._em.addSystem(ComponentType.BEHAVIOUR, behaviourSystem);
    this._em.addSystem(ComponentType.AD, adSystem);

    this._userInputManager
      = new UserInputManager(this._em,
                             this._scheduler,
                             this._onDirectionKeyDown.bind(this),
                             this._onDirectionKeyUp.bind(this),
                             this._onEnterKeyPress.bind(this),
                             this.logOut.bind(this));
  }

  async connect() {
    this._ws = new WebSocket(__WEBSOCKET_URL__);
    this._ws.onmessage = ev => this._onServerMessage(ev);

    await waitForCondition(() => this._ws !== undefined &&
                                 this._ws.readyState === WebSocket.OPEN,
                           500,
                           10);
  }

  get connected() {
    return this._ws !== undefined;
  }

  get username() {
    return this._username;
  }

  disconnect() {
    if (this._ws) {
      this._ws.close();
      this._ws = undefined;
    }
  }

  async initialise() {
    this._insertElement();

    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    await renderSys.init();

    this._onWindowResize();
  }

  logIn(identity: string, password: string): Promise<RLogInSuccess> {
    if (!this._ws) {
      throw new GameError("Not connected");
    }

    const data: LogInAction = {
      playerId: PLAYER_ID_UNSET,
      type: ActionType.LOG_IN,
      identity,
      password
    };

    const dataString = JSON.stringify(data);

    this._ws.send(dataString);

    return this._getPromiseForServerResponse((msg, resolve, reject) => {
      if (msg.type === GameResponseType.LOG_IN_SUCCESS) {
        resolve(<RLogInSuccess>msg);
        return true;
      }
      else if (msg.type === GameResponseType.ERROR) {
        const error = <RError>(msg);
        if (error.code === ErrorCode.LOG_IN_FAILURE) {
          reject();
          return true;
        }
      }
      return false;
    });
  }

  signUp(email: string, username: string, password: string): Promise<void> {
    if (!this._ws) {
      throw new GameError("Not connected");
    }

    const data: SignUpAction = {
      playerId: PLAYER_ID_UNSET,
      type: ActionType.SIGN_UP,
      email,
      username,
      password
    };

    const dataString = JSON.stringify(data);

    this._ws.send(dataString);

    return this._getPromiseForServerResponse((msg, resolve, reject) => {
      if (msg.type === GameResponseType.SIGN_UP_SUCCESS) {
        resolve();
        return true;
      }
      else if (msg.type === GameResponseType.SIGN_UP_FAILURE) {
        const failure = <RSignUpFailure>(msg);
        reject(failure.reason);
        return true;
      }
      return false;
    });
  }

  logOut() {
    this._pinataId = undefined;
    this._pinataToken = undefined;
    this._username = undefined;
    this._playerId = PLAYER_ID_UNSET;

    this.disconnect();

    this._userInputManager.destroy();

    this._em.removeAll();
    this._gameState = GameState.GAME_INACTIVE;

    this._onStateChange(this._gameState);
  }

  start(pinataCredentials?: PinataCredentials) {
    if (!this._ws) {
      throw new GameError("Not connected");
    }

    this._userInputManager.initialise();

    const pinataId = pinataCredentials ?
                     pinataCredentials.pinataId : this._pinataId;

    const pinataToken = pinataCredentials ?
                        pinataCredentials.pinataToken : this._pinataToken;

    this._username = pinataCredentials ?
                     pinataCredentials.username : this._username;

    const data: JoinGameAction = {
      playerId: PLAYER_ID_UNSET,
      type: ActionType.JOIN_GAME,
      pinataId,
      pinataToken
    };

    const dataString = JSON.stringify(data);
    this._ws.send(dataString);
  }

  private _getPromiseForServerResponse<T>(handler: ServerResponseHandlerFn<T>):
    Promise<T> {

    return new Promise<T>((resolve, reject) => {
      this._serverResponseHandlers.push({
        handlerFn: handler,
        resolve,
        reject
      });
    });
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

    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    renderSys.onWindowResized(w, h);

    if (this._gameState != GameState.GAME_INACTIVE) {
      const event: EWindowResized = {
        type: GameEventType.WINDOW_RESIZED,
        entities: [],
        w,
        h
      }

      this._em.postEvent(event);
    }
  }

  private _centreStage() {
    if (this._playerId >= 0) {
      const player =
        <CSpatial>this._em.getComponent(ComponentType.SPATIAL,
                                                      this._playerId);

      const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);

      const camX = renderSys.cameraX;
      const camY = renderSys.cameraY;
      const t = 0.25;
      const v = { x: player.x - camX, y: player.y - camY };

      if (this._mapData) {
        const worldW = this._mapData.width * BLOCK_SZ;
        const worldH = this._mapData.height * BLOCK_SZ;

        const minX = renderSys.viewW  * 0.5;
        const minY = renderSys.viewH * 0.5;
        const maxX = worldW - renderSys.viewW * 0.5;
        const maxY = worldH - renderSys.viewH * 0.5;

        let destX = camX + v.x / (t * CLIENT_FRAME_RATE);
        let destY = camY + v.y / (t * CLIENT_FRAME_RATE);

        destX = Math.min(Math.max(destX, minX), maxX);
        destY = Math.min(Math.max(destY, minY), maxY);

        renderSys.setCameraPosition(destX, destY);
      }
    }
  }

  private _processUserActions() {
    if (this._ws) {
      for (const action of this._actionQueue) {
        if (this._playerId != PLAYER_ID_DEAD) {
          const dataString = JSON.stringify(action);
          this._ws.send(dataString);
        }
      }

      this._actionQueue = [];
    }
  }

  private _requestRespawn() {
    if (!this._ws) {
      throw new GameError("Not connected");
    }

    const action: RespawnAction = {
      type: ActionType.RESPAWN,
      playerId: PLAYER_ID_UNSET
    };

    const dataString = JSON.stringify(action);
    this._ws.send(dataString);
  }

  private _startGame(playerId: EntityId) {
    this._playerId = playerId;
  }

  private _updateGameState(response: RGameState) {
    response.packets.forEach(packet => {
      this._em.updateComponent(packet);
    });
  }

  private _handleServerError(response: RError) {
    console.error("Received error from server: " + response.message);
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
    this._mapData = mapData;
    this._onWindowResize();
    constructInitialEntitiesFromMapData(this._em, mapData);
  }

  private _setGameState(state: GameState) {
    this._gameState = state;
    this._onStateChange(this._gameState);
  }

  private _onLogInSuccess(msg: RLogInSuccess) {
    this._pinataId = msg.pinataId;
    this._pinataToken = msg.pinataToken;
    this._username = msg.username;
  }

  private _handleServerMessage(msg: GameResponse) {
    switch (msg.type) {
      case GameResponseType.MAP_DATA:{
        const m = <RMapData>msg;
        this._initialiseGame(m.mapData);
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
      case GameResponseType.LOG_IN_SUCCESS: {
        const m = <RLogInSuccess>msg;
        this._onLogInSuccess(m);
        break;
      }
      case GameResponseType.SIGN_UP_SUCCESS: {
        // Do nothing
        break;
      }
      case GameResponseType.JOIN_GAME_SUCCESS: {
        const m = <RJoinGameSuccess>msg;
        this._startGame(m.playerId);

        this._setGameState(GameState.GAME_ACTIVE);
        this._onWindowResize();
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

      for (let i = 0; i < this._serverResponseHandlers.length; ++i) {
        const handler = this._serverResponseHandlers[i];
        const done = handler.handlerFn(msg, handler.resolve, handler.reject);
        if (done) {
          this._serverResponseHandlers.splice(i, 1);
          --i;
        }
      }
    }
  }

  private _onServerMessage(event: MessageEvent) {
    const msg = <GameResponse>JSON.parse(event.data);
    this._responseQueue.push(msg);
  }

  private _insertElement() {
    const parentElement = document.getElementById("terrestria");
    if (!parentElement) {
      throw new GameError("Could not find #terrestria");
    }
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    parentElement.appendChild(renderSys.getCanvas());
  }
}
