import _ from "underscore";
import { GameError, ErrorCode } from "./error";
import { ActionType, PlayerAction } from "./action";
import { constructSoil, constructRock, constructGem,
         constructPlayer } from "./game_objects";
import { EntityManager, EntityId } from "./entity_manager";
import { SpatialSystem } from "./spatial_system";
import { AgentSystem } from "./agent_system";
import { ComponentType } from "./component_types";

const WORLD_W = 100;
const WORLD_H = 100;

export class Game {
  private static nextGameId: number = 0;

  private _id: number;
  private _entityManager: EntityManager;  

  constructor() {
    this._id = Game.nextGameId++;
    this._entityManager = new EntityManager();

    const spatialSystem = new SpatialSystem(WORLD_W, WORLD_H);
    const agentSystem = new AgentSystem();

    this._entityManager.addSystem(ComponentType.SPATIAL, spatialSystem);
    this._entityManager.addSystem(ComponentType.AGENT, agentSystem);

    console.log(`Starting game ${this._id}`);

    this._populate();
  }

  private _populate() {
    const spatialSys = <SpatialSystem>this._entityManager
                                          .getSystem(ComponentType.SPATIAL);

    const numRocks = 10;
    const numGems = 10;

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

  handlePlayerAction(entityId: EntityId, action: PlayerAction) {
    console.log(`Handling player action, entityId = ${entityId}`);
    console.log(action);

    switch (action.type) {
      case ActionType.MOVE: {
        console.log("Player moved");
        break;
      }
      case ActionType.JUMP: {
        console.log("Player jumped");
        break;
      }
      default: {
        throw new GameError(`No such action '${action.type}'`,
                            ErrorCode.BAD_REQUEST);
      }
    }
  }
}
