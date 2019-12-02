import WebSocket from "ws";
import _ from "underscore";
import { PlayerAction } from "./common/action";
import { constructPlayer } from "./factory";
import { ComponentType } from "./common/component_types";
import { Pipe } from "./pipe";
import { GameResponseType, RGameState, RNewEntities,
         RPlayerKilled, RMapData } from "./common/response";
import { GameLogic } from "./game_logic";
import { WORLD_H, BLOCK_SZ, SERVER_FRAME_DURATION_MS, 
         SYNC_INTERVAL_MS } from "./common/constants";
import { EntityType } from "./common/game_objects";
import { BehaviourComponent, EventHandlerFn } from "./common/behaviour_system";
import { ServerEntityManager } from "./server_entity_manager";
import { EntityId } from "./common/system";
import { debounce } from "./common/utils";
import { getNextEntityId } from "./common/entity_manager";
import { GameEventType, GameEvent, EPlayerKilled } from "./common/event";
import { GameError, ErrorCode } from "./common/error";
import { AppConfig } from "./config";
import { ServerSpatialComponent } from "./server_spatial_component";
import { loadMap, loadMapData } from "./map_loader";
import { MapData } from "./common/map_data";

function noThrow(fn: () => any) {
  try {
    return fn();
  }
  catch (err) {
    console.error(err);
  }
}

export class Game {
  private static nextGameId: number = 0;

  private _appConfig: AppConfig;
  private _mapData: MapData;
  private _id: number;
  private _pipe: Pipe;
  private _em: ServerEntityManager;
  private _loopTimeout: NodeJS.Timeout;
  private _actionQueue: PlayerAction[] = [];
  private _gameLogic: GameLogic;
  private _entityId: EntityId;
  private _doSyncFn: () => void;

  constructor(appConfig: AppConfig) {
    this._appConfig = appConfig;
    this._id = Game.nextGameId++;
    this._pipe = new Pipe();
    this._em = new ServerEntityManager(this._pipe);

    this._mapData = loadMapData();
    loadMap(this._em, this._mapData);

    this._gameLogic = new GameLogic(this._em);

    this._entityId = getNextEntityId();
    const targetedHandlers = new Map<GameEventType, EventHandlerFn>();
    const broadcastHandlers = new Map<GameEventType, EventHandlerFn>();
    broadcastHandlers.set(GameEventType.PLAYER_KILLED,
                          event => this._onPlayerKilled(event));

    const behaviourComp = new BehaviourComponent(this._entityId,
                                                 targetedHandlers,
                                                 broadcastHandlers);

    this._em.addEntity(this._entityId, EntityType.OTHER, [behaviourComp]);

    console.log(`Starting game ${this._id}`);

    this._loopTimeout = setInterval(() => noThrow(this._tick.bind(this)),
                                    SERVER_FRAME_DURATION_MS);

    this._doSyncFn = debounce(this, this._doSync, SYNC_INTERVAL_MS);
  }

  addPlayer(socket: WebSocket, pinataId: string, pinataToken: string) {
    const entities = this._em.getEntities();
  
    const id = constructPlayer(this._em, pinataId, pinataToken);
    const spatial =
      <ServerSpatialComponent>this._em.getComponent(ComponentType.SPATIAL, id);
    spatial.setStaticPos(0, (WORLD_H - 1) * BLOCK_SZ);

    this._gameLogic.addPlayer(id);

    console.log(`Adding player ${id}`);
  
    this._pipe.addConnection(id, socket);

    const mapDataResp: RMapData = {
      type: GameResponseType.MAP_DATA,
      mapData: _.omit(this._mapData, "entities")
    };

    const newEntitiesResp: RNewEntities = {
      type: GameResponseType.NEW_ENTITIES,
      entities: entities
    };

    const stateUpdateResp: RGameState = {
      type: GameResponseType.GAME_STATE,
      packets: this._em.getState()
    }

    const newPlayerResp: RNewEntities = {
      type: GameResponseType.NEW_ENTITIES,
      entities: [{
        id,
        type: EntityType.PLAYER
      }]
    };

    this._pipe.send(id, mapDataResp);
    this._pipe.send(id, newEntitiesResp);
    this._pipe.sendToAll(newPlayerResp);
    this._pipe.send(id, stateUpdateResp);

    return id;
  }

  respawnPlayer(oldId: EntityId, pinataId: string, pinataToken: string) {
    if (this._em.hasEntity(oldId)) {
      throw new GameError(`Cannot respawn; player ${oldId} is still alive`,
                          ErrorCode.BAD_REQUEST);
    }

    if (!this._pipe.hasConnection(oldId)) {
      throw new GameError(`Unrecognised player id ${oldId}`,
                          ErrorCode.BAD_REQUEST);
    }

    const id = constructPlayer(this._em, pinataId, pinataToken);
    const spatial =
      <ServerSpatialComponent>this._em.getComponent(ComponentType.SPATIAL, id);
    spatial.setStaticPos(0, (WORLD_H - 1) * BLOCK_SZ);

    const socket = this._pipe.getConnection(oldId);
    this._pipe.removeConnection(oldId);
    this._pipe.addConnection(id, socket);

    this._gameLogic.addPlayer(id);

    console.log(`Respawning player ${oldId} => ${id}`);

    const newPlayerResp: RNewEntities = {
      type: GameResponseType.NEW_ENTITIES,
      entities: [{
        id,
        type: EntityType.PLAYER
      }]
    };

    this._pipe.sendToAll(newPlayerResp);

    return id;
  }

  removePlayer(playerId: EntityId) {
    console.log(`Removing player ${playerId} from game`);
    this._pipe.removeConnection(playerId);
    this._gameLogic.removePlayer(playerId);
    this._em.removeEntity_onClients(playerId);
  }

  hasPlayer(playerId: EntityId): boolean {
    return this._pipe.hasConnection(playerId);
  }

  get numPlayers() {
    return this._pipe.numConnections;
  }

  get id() {
    return this._id;
  }

  onPlayerAction(action: PlayerAction) {
    this._actionQueue.push(action);
  }

  terminate() {
    console.log(`Terminating game ${this._id}`);
    clearInterval(this._loopTimeout);
  }

  private _onPlayerKilled(e: GameEvent) {
    const event = <EPlayerKilled>e;

    const msg: RPlayerKilled = {
      type: GameResponseType.PLAYER_KILLED
    };

    this._pipe.send(event.playerId, msg);
  }

  private _doSync() {
    const dirties = this._em.getDirties();

    if (dirties.length > 0) {
      const response: RGameState = {
        type: GameResponseType.GAME_STATE,
        packets: dirties
      };

      this._pipe.sendToAll(response);
    }

    this._em.transmitEvents();
  }

  private _tick() {
    this._em.update();

    try {
      this._gameLogic.update(this._actionQueue);
    }
    catch (e) {
      this._actionQueue = [];
      throw e;
    }
    this._actionQueue = [];

    this._doSyncFn();
  }
}
