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
  private _queuedMovedmentAction: PlayerAction|null = null;

  constructor(entityManager: EntityManager) {
    this._entityManager = entityManager;
  }

  update(actions: PlayerAction[]) {
    if (this._queuedMovedmentAction) {
      this._handlePlayerAction(this._queuedMovedmentAction);
      this._queuedMovedmentAction = null;
    }
    actions.forEach(action => this._handlePlayerAction(action));
  }

  private _movePlayer(action: MoveAction) {
    const spatialSys = <SpatialSystem>this._entityManager
                                          .getSystem(ComponentType.SPATIAL);

    if (spatialSys.entityIsMoving(action.playerId)) {
      this._queuedMovedmentAction = action;
    }
    else {
      const v = directionToVector(action.direction);
      const t = 1.0 / PLAYER_SPEED;
      spatialSys.moveEntity_tween(action.playerId, v[0], v[1], t);
    }
  }

  private _handlePlayerAction(action: PlayerAction) {
    console.log("Game logic: Handling player action");

    switch (action.type) {
      case ActionType.MOVE: {
        this._movePlayer(<MoveAction>action);
        break;
      }
    }
  }
}
