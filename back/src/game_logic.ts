import { PlayerAction, ActionType, MoveAction, Direction } from "./action";
import { EntityManager } from "./entity_manager";
import { ComponentType } from "./component_types";
import { SpatialSystem } from "./spatial_system";

function directionToVector(dir: Direction) {
  switch (dir) {
    case Direction.UP: return [0, 1];
    case Direction.RIGHT: return [1, 0];
    case Direction.DOWN: return [0, -1];
    case Direction.LEFT: return [-1, 0];
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
        spatialSys.moveEntity(ac.playerId, v[0], v[1]);
      }
    }
  }
}
