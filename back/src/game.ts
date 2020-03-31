import WebSocket from "ws";
import _ from "underscore";
import { PlayerAction } from "./common/action";
import { EntityFactory } from "./entity_factory";
import { ComponentType } from "./common/component_types";
import { Pipe } from "./pipe";
import { GameResponseType, RGameState, RNewEntities, RPlayerKilled,
         RMapData } from "./common/response";
import { BLOCK_SZ, SERVER_FRAME_DURATION_MS, SYNC_INTERVAL_MS, 
         SERVER_FRAME_RATE } from "./common/constants";
import { EntityType } from "./common/game_objects";
import { CBehaviour, EventHandlerFn } from "./common/behaviour_system";
import { EntityManager, getNextEntityId } from "./entity_manager";
import { EntityId } from "./common/system";
import { debounce } from "./common/utils";
import { GameEventType, GameEvent, EPlayerKilled } from "./common/event";
import { GameError, ErrorCode } from "./common/error";
import { AppConfig } from "./config";
import { CSpatial } from "./spatial_component";
import { MapLoader } from "./map_loader";
import { MapData } from "./common/map_data";
import { Pinata } from "./pinata";
import { Logger } from "./logger";
import { Scheduler } from "./common/scheduler";
import { AgentSystem } from "./agent_system";

function noThrow(logger: Logger, fn: () => any) {
  try {
    return fn();
  }
  catch (err) {
    logger.error(err);
  }
}

export class Game {
  private static nextGameId: number = 0;

  private _appConfig: AppConfig;
  private _logger: Logger;
  private _pinata: Pinata;
  private _mapData: MapData;
  private _id: number;
  private _pipe: Pipe;
  private _em: EntityManager;
  private _scheduler: Scheduler;
  private _factory: EntityFactory;
  private _loopTimeout: NodeJS.Timeout;
  private _entityId: EntityId;
  private _doSyncFn: () => void;

  constructor(appConfig: AppConfig, logger: Logger, pinata: Pinata) {
    this._appConfig = appConfig;
    this._logger = logger;
    this._pinata = pinata;
    this._id = Game.nextGameId++;
    this._pipe = new Pipe();
    this._em = new EntityManager(this._pipe);
    this._scheduler = new Scheduler();
    this._factory = new EntityFactory(this._em, this._scheduler);

    const mapLoader = new MapLoader(this._em,
                                    this._pinata,
                                    this._factory,
                                    this._pipe,
                                    this._logger);
    mapLoader.loadMap(pinata);
    this._mapData = <MapData>mapLoader.mapData;
  
    this._entityId = getNextEntityId();
    const targetedHandlers = new Map<GameEventType, EventHandlerFn>();
    const broadcastHandlers = new Map<GameEventType, EventHandlerFn>();
    broadcastHandlers.set(GameEventType.PLAYER_KILLED,
                          event => this._onPlayerKilled(event));

    const behaviourComp = new CBehaviour(this._entityId,
                                         targetedHandlers,
                                         broadcastHandlers);

    this._em.addEntity(this._entityId, EntityType.OTHER, {}, [behaviourComp]);

    this._logger.info(`Starting game ${this._id}`);

    this._loopTimeout = setInterval(() => {
      return noThrow(this._logger, this._tick.bind(this));
    }, SERVER_FRAME_DURATION_MS);

    this._doSyncFn = debounce(this, this._doSync, SYNC_INTERVAL_MS);
  }

  addPlayer(socket: WebSocket, pinataId?: string, pinataToken?: string) {
    const entities = this._em.getEntities();
  
    const id = this._factory.constructEntity({
      type: EntityType.PLAYER,
      data: {
        pinataId,
        pinataToken
      }
    });
    const spatial = <CSpatial>this._em.getComponent(ComponentType.SPATIAL, id);
    spatial.setStaticPos(this._mapData.spawnPoint.x * BLOCK_SZ,
                         this._mapData.spawnPoint.y * BLOCK_SZ);

    this._logger.info(`Adding player ${id} with pinata id ${pinataId}`);
  
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
    };

    const newPlayerResp: RNewEntities = {
      type: GameResponseType.NEW_ENTITIES,
      entities: [{
        id,
        type: EntityType.PLAYER,
        desc: {}
      }]
    };

    this._pipe.send(id, mapDataResp);
    this._pipe.sendToAll(newPlayerResp);
    this._pipe.send(id, newEntitiesResp);
    this._pipe.send(id, stateUpdateResp);

    return id;
  }

  respawnPlayer(oldId: EntityId, pinataId?: string, pinataToken?: string) {
    if (this._em.hasEntity(oldId)) {
      throw new GameError(`Cannot respawn; player ${oldId} is still alive`,
                          ErrorCode.BAD_MESSAGE);
    }

    if (!this._pipe.hasConnection(oldId)) {
      throw new GameError(`Unrecognised player id ${oldId}`,
                          ErrorCode.BAD_MESSAGE);
    }

    const id = this._factory.constructEntity({
      type: EntityType.PLAYER,
      data: {
        pinataId, pinataToken
      }
    });
    const spatial = <CSpatial>this._em.getComponent(ComponentType.SPATIAL, id);
    spatial.setStaticPos(this._mapData.spawnPoint.x * BLOCK_SZ,
                         this._mapData.spawnPoint.y * BLOCK_SZ);

    const socket = this._pipe.getConnection(oldId);
    this._pipe.removeConnection(oldId);
    this._pipe.addConnection(id, socket);

    this._logger.info(`Respawning player ${oldId} => ${id}`);

    const newPlayerResp: RNewEntities = {
      type: GameResponseType.NEW_ENTITIES,
      entities: [{
        id,
        type: EntityType.PLAYER,
        desc: {}
      }]
    };

    this._pipe.sendToAll(newPlayerResp);

    return id;
  }

  removePlayer(playerId: EntityId) {
    this._logger.info(`Removing player ${playerId} from game`);
    this._pipe.removeConnection(playerId);
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
    const agentSys = <AgentSystem>this._em.getSystem(ComponentType.AGENT);
    agentSys.onPlayerAction(action);
  }

  terminate() {
    this._logger.info(`Terminating game ${this._id}`);
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

  private _frame = 0;
  private _start = (new Date()).getTime();

  private _tick() {
    this._em.update();
    this._scheduler.update();
    this._doSyncFn();

    if (this._frame % SERVER_FRAME_RATE === 0) {
      const now = (new Date()).getTime();
      const elapsed = now - this._start;
      const frameRate = 1000 * SERVER_FRAME_RATE / elapsed;

      console.log(`Frame rate: ${frameRate}/${SERVER_FRAME_RATE}`);

      this._start = now;
    }

    this._frame++;
  }
}
