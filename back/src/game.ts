import _ from "underscore";
import { PlayerAction } from "./action";
import { constructSoil, constructRock, constructGem,
         constructPlayer } from "./game_objects";
import { EntityManager, EntityId } from "./entity_manager";
import { SpatialSystem } from "./spatial_system";
import { AgentSystem } from "./agent_system";
import { ComponentType } from "./component_types";
import { Pipe } from "./pipe";
import { GameResponse, GameResponseType } from "./response";
import { GameLogic } from "./game_logic";

const WORLD_W = 10;
const WORLD_H = 10;
const FRAME_DURATION_MS = 100;

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
  private _entityManager: EntityManager;
  private _loopTimeout: NodeJS.Timeout;
  private _actionQueue: PlayerAction[] = [];
  private _gameLogic: GameLogic;

  constructor(pipe: Pipe) {
    this._id = Game.nextGameId++;
    this._pipe = pipe;
    this._entityManager = new EntityManager();

    const spatialSystem = new SpatialSystem(WORLD_W, WORLD_H);
    const agentSystem = new AgentSystem();

    this._entityManager.addSystem(ComponentType.SPATIAL, spatialSystem);
    this._entityManager.addSystem(ComponentType.AGENT, agentSystem);

    this._gameLogic = new GameLogic(this._entityManager);

    console.log(`Starting game ${this._id}`);

    this._populate();

    this._loopTimeout = setInterval(() => noThrow(this._tick.bind(this)),
                                    FRAME_DURATION_MS);
  }

  private _tick() {
    while (this._actionQueue.length > 0) {
      const action = <PlayerAction>this._actionQueue.shift();
      this._gameLogic.handlePlayerAction(action);
    }

    this._entityManager.update();
    const dirties = this._entityManager.getDirties();

    if (dirties.length > 0) {
      console.log("Sending state update");
      console.log(dirties);

      const response: GameResponse = {
        type: GameResponseType.GAME_STATE,
        data: dirties
      };

      this._pipe.send(response);
    }
  }

  private _populate() {
    const spatialSys = <SpatialSystem>this._entityManager
                                          .getSystem(ComponentType.SPATIAL);

    const numRocks = 5;
    const numGems = 5;

    const coords = [];
    for (let c = 0; c < WORLD_W; ++c) {
      for (let r = 0; r < WORLD_H; ++r) {
        coords.push([c, r]);
      }
    }

    _.shuffle(coords);
  
    let idx = 0;
    const rockCoords = coords.slice(0, numRocks);
    idx += numRocks;
    const gemCoords = coords.slice(idx, numGems);
    idx += numGems;
    const soilCoords = coords.slice(idx);

    rockCoords.forEach(([c, r]) => {
      const id = constructRock(this._entityManager);
      spatialSys.positionEntity(id, c, r);
    });

    gemCoords.forEach(([c, r]) => {
      const id = constructGem(this._entityManager);
      spatialSys.positionEntity(id, c, r);
    });

    soilCoords.forEach(([c, r]) => {
      const id = constructSoil(this._entityManager);
      spatialSys.positionEntity(id, c, r);
    });
  }

  addPlayer(pinataId: string, pinataToken: string): EntityId {
    const id = constructPlayer(this._entityManager, pinataId, pinataToken);
    console.log(`Adding player ${id}`);
    return id;
  }

  removePlayer(id: EntityId) {
    console.log(`Removing player ${id}`);
    this._entityManager.removeEntity(id);
  }

  get numPlayers() {
    return this._entityManager.getSystem(ComponentType.AGENT).numComponents();
  }

  get id() {
    return this._id;
  }

  onPlayerAction(action: PlayerAction) {
    console.log(`Received ${action.type} action from player ` +
                `${action.playerId}`);

    this._actionQueue.push(action);
  }

  terminate() {
    console.log(`Terminating game ${this._id}`);
    clearInterval(this._loopTimeout);
  }
}
