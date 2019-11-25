import WebSocket from "ws";
import _ from "underscore";
import { PlayerAction } from "./common/action";
import { constructSoil, constructRock, constructGem,
         constructPlayer } from "./factory";
import { AgentSystem } from "./agent_system";
import { ComponentType } from "./common/component_types";
import { Pipe } from "./pipe";
import { GameResponseType, RGameState, RNewEntities,
         RPlayerKilled } from "./common/response";
import { GameLogic } from "./game_logic";
import { WORLD_W, WORLD_H, BLOCK_SZ, SERVER_FRAME_DURATION_MS, 
         SYNC_INTERVAL_MS } from "./common/constants";
import { EntityType } from "./common/game_objects";
import { BehaviourSystem, BehaviourComponent,
         EventHandlerFn } from "./common/behaviour_system";
import { ServerEntityManager } from "./server_entity_manager";
import { EntityId } from "./common/system";
import { debounce } from "./common/utils";
import { InventorySystem } from "./inventory_system";
import { getNextEntityId } from "./common/entity_manager";
import { GameEventType, GameEvent, EPlayerKilled } from "./common/event";
import { GameError, ErrorCode } from "./common/error";
import { AppConfig } from "./config";
import { Span, Span2d } from "./common/span";
import { ServerSpatialSystem } from "./server_spatial_system";
import { ServerSpatialComponent } from "./server_spatial_component";

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
  private _id: number;
  private _pipe: Pipe;
  private _em: ServerEntityManager;
  private _loopTimeout: NodeJS.Timeout;
  private _actionQueue: PlayerAction[] = [];
  private _gameLogic: GameLogic;
  private _entityId: EntityId;
  private _doSyncFn: () => void;
  private _gravRegion = new Span2d();

  constructor(appConfig: AppConfig) {
    this._appConfig = appConfig;
    this._id = Game.nextGameId++;
    this._pipe = new Pipe();
    this._em = new ServerEntityManager(this._pipe);

    this._createGravRegion();

    const serverSpatialSystem = new ServerSpatialSystem(this._em,
                                                        WORLD_W,
                                                        WORLD_H,
                                                        this._gravRegion);
    const agentSystem = new AgentSystem(this._em);
    const behaviourSystem = new BehaviourSystem();
    const inventorySystem = new InventorySystem();

    this._em.addSystem(ComponentType.SPATIAL, serverSpatialSystem);
    this._em.addSystem(ComponentType.AGENT, agentSystem);
    this._em.addSystem(ComponentType.BEHAVIOUR, behaviourSystem);
    this._em.addSystem(ComponentType.INVENTORY, inventorySystem);

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

    this._populate();

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

  private _createGravRegion() {
    this._gravRegion.addHorizontalSpan(0, new Span(0, WORLD_W - 1));
    this._gravRegion.addHorizontalSpan(1, new Span(0, WORLD_W - 1));
    this._gravRegion.addHorizontalSpan(2, new Span(0, WORLD_W - 1));
    this._gravRegion.addHorizontalSpan(3, new Span(0, WORLD_W - 1));
    this._gravRegion.addHorizontalSpan(4, new Span(0, WORLD_W - 1));

    this._gravRegion.addHorizontalSpan(11, new Span(7, 16));
    this._gravRegion.addHorizontalSpan(12, new Span(6, 17));
    this._gravRegion.addHorizontalSpan(13, new Span(6, 17));
    this._gravRegion.addHorizontalSpan(14, new Span(7, 18));
    this._gravRegion.addHorizontalSpan(15, new Span(7, 16));
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
    try {
      this._gameLogic.update(this._actionQueue);
    }
    catch (e) {
      this._actionQueue = [];
      throw e;
    }

    this._actionQueue = [];

    this._em.update();

    this._doSyncFn();
  }

  private _populate() {
    const spatialSys =
      <ServerSpatialSystem>this._em.getSystem(ComponentType.SPATIAL);

    const numRocks = 20;
    const numGems = 10;

    let coords: [number, number][] = [];
    for (let c = 0; c < WORLD_W; ++c) {
      for (let r = 0; r < WORLD_H; ++r) {
        if (c === 0 && r === WORLD_H - 1) {
          continue;
        }
        if (this._gravRegion.contains(c, r)) {
          continue;
        }
        coords.push([c * BLOCK_SZ, r * BLOCK_SZ]);
      }
    }

    coords = _.shuffle(coords);

    let idx = 0;
    const rockCoords = coords.slice(0, numRocks);
    idx += numRocks;
    const gemCoords = coords.slice(idx, idx + numGems);
    idx += numGems;
    const soilCoords = coords.slice(idx);

    rockCoords.forEach(([c, r]) => {
      const id = constructRock(this._em);
      spatialSys.positionEntity(id, c, r);
    });

    gemCoords.forEach(([c, r]) => {
      const id = constructGem(this._em);
      spatialSys.positionEntity(id, c, r);
    });

    soilCoords.forEach(([c, r]) => {
      const id = constructSoil(this._em);
      spatialSys.positionEntity(id, c, r);
    });
  }
}
