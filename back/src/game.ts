import WebSocket from "ws";
import _ from "underscore";
import { PlayerAction, ActionType,
         ReqStateUpdateAction } from "./common/action";
import { constructSoil, constructRock, constructGem,
         constructPlayer } from "./factory";
import { AgentSystem } from "./common/agent_system";
import { ComponentType } from "./common/component_types";
import { Pipe } from "./pipe";
import { GameResponseType, RGameState, RNewEntities } from "./common/response";
import { GameLogic } from "./game_logic";
import { WORLD_W, WORLD_H, BLOCK_SZ, SERVER_FRAME_DURATION_MS, 
         SERVER_FRAME_RATE, SYNC_INTERVAL_MS } from "./common/config";
import { EntityType } from "./common/game_objects";
import { BehaviourSystem } from "./behaviour_system";
import { ServerEntityManager } from "./server_entity_manager";
import { EntityId, ComponentPacket } from "./common/system";
import { ServerSpatialSystem } from "./server_spatial_system";
import { debounce } from "./common/utils";
import { InventorySystem } from "./inventory_system";
import { ServerSystem } from "./common/server_system";

function noThrow(fn: () => any) {
  try {
    return fn();
  }
  catch (err) {
    console.error("Error! " + err);
  }
}

export class Game {
  private static nextGameId: number = 0;

  private _id: number;
  private _pipe: Pipe;
  private _em: ServerEntityManager;
  private _loopTimeout: NodeJS.Timeout;
  private _actionQueue: PlayerAction[] = [];
  private _stateUpdateReqs: ReqStateUpdateAction[] = [];
  private _gameLogic: GameLogic;
  private _doSyncFn: () => void;

  constructor() {
    this._id = Game.nextGameId++;
    this._pipe = new Pipe();
    this._em = new ServerEntityManager(this._pipe);

    const spatialSystem = new ServerSpatialSystem(this._em,
                                                  WORLD_W,
                                                  WORLD_H,
                                                  SERVER_FRAME_RATE);
    const agentSystem = new AgentSystem();
    const behaviourSystem = new BehaviourSystem();
    const inventorySystem = new InventorySystem();

    this._em.addSystem(ComponentType.SPATIAL, spatialSystem);
    this._em.addSystem(ComponentType.AGENT, agentSystem);
    this._em.addSystem(ComponentType.BEHAVIOUR, behaviourSystem);
    this._em.addSystem(ComponentType.INVENTORY, inventorySystem);

    this._gameLogic = new GameLogic(this._em);

    console.log(`Starting game ${this._id}`);

    this._populate();

    this._loopTimeout = setInterval(() => noThrow(this._tick.bind(this)),
                                    SERVER_FRAME_DURATION_MS);

    this._doSyncFn = debounce(this, this._doSync, SYNC_INTERVAL_MS);
  }

  private _doSync() {
    this._stateUpdateReqs.forEach(req => {
      const updates: ComponentPacket[] = [];
      req.components.forEach(c => {
        const sys = <ServerSystem>this._em.getSystem(c.componentType);
        updates.push(sys.getComponentState(c.entityId));
      });

      const response: RGameState = {
        type: GameResponseType.GAME_STATE,
        packets: updates
      };

      if (updates.length > 0) {
        this._pipe.send(req.playerId, response);
      }
    });
    this._stateUpdateReqs = [];

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
    this._gameLogic.update(this._actionQueue);
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

  addPlayer(socket: WebSocket, pinataId: string, pinataToken: string) {
    const entities = this._em.getEntities();
  
    const id = constructPlayer(this._em, pinataId, pinataToken);

    console.log(`Adding player ${id}`);
  
    this._pipe.addSocket(id, socket);

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

  removePlayer(id: EntityId) {
    console.log(`Removing player ${id}`);
    this._pipe.removeSocket(id);
    this._em.removeEntity(id);
  }

  get numPlayers() {
    return this._em.getSystem(ComponentType.AGENT).numComponents();
  }

  get id() {
    return this._id;
  }

  onPlayerAction(action: PlayerAction) {
    if (action.type == ActionType.REQ_STATE_UPDATE) {
      this._stateUpdateReqs.push(<ReqStateUpdateAction>action);
    }
    else {
      this._actionQueue.push(action);
    }
  }

  terminate() {
    console.log(`Terminating game ${this._id}`);
    clearInterval(this._loopTimeout);
  }
}
