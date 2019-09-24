import { PlayerAction, ActionType, MoveAction,
         Direction } from "./common/action";
import { EntityManager } from "./common/entity_manager";
import { ComponentType } from "./common/component_types";
import { SpatialSystem } from "./common/spatial_system";
import { BLOCK_SZ, PLAYER_SPEED } from "./common/config";

function directionToVector(dir: Direction) {
  switch (dir) {
    case Direction.UP: return [0, BLOCK_SZ];
    case Direction.RIGHT: return [BLOCK_SZ, 0];
    case Direction.DOWN: return [0, -BLOCK_SZ];
    case Direction.LEFT: return [-BLOCK_SZ, 0];
    default: return [0, 0];
  }
}

export class GameLogic {
  private _entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this._entityManager = entityManager;
  }

  handlePlayerAction(action: PlayerAction) {
    console.log("Game logic: Handling player action");

    const spatialSys = <SpatialSystem>this._entityManager
                                          .getSystem(ComponentType.SPATIAL);

    switch (action.type) {
      case ActionType.MOVE: {
        const ac = <MoveAction>action;
        console.log(ac);
        const v = directionToVector(ac.direction);
        spatialSys.moveEntity(ac.playerId, v[0], v[1], 1.0 / PLAYER_SPEED);
      }
    }
  }
}
