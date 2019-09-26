import { PlayerAction, ActionType, MoveAction,
         Direction } from "./common/action";
import { EntityManager, EntityId } from "./common/entity_manager";
import { ComponentType } from "./common/component_types";
import { SpatialSystem } from "./common/spatial_system";
import { BLOCK_SZ, FRAMES_PER_BLOCK, SERVER_FRAME_RATE } from "./common/config";

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
  private _queuedAction: PlayerAction|null = null;

  constructor(entityManager: EntityManager) {
    this._entityManager = entityManager;
  }

  update(actions: PlayerAction[]) {
    if (this._queuedAction) {
      if (this._handlePlayerAction(this._queuedAction)) {
        this._queuedAction = null;
      }
    }

    actions.forEach(action => {
      if (!this._handlePlayerAction(action)) {
        this._queuedAction = action;
      }
    });
  }

  private _movePlayer(action: MoveAction): boolean {
    const spatialSys = <SpatialSystem>this._entityManager
                                          .getSystem(ComponentType.SPATIAL);

    if (spatialSys.entityIsMoving(action.playerId)) {
      this._queuedAction = action;
      return false;
    }
    else {
      const v = directionToVector(action.direction);
      const t = FRAMES_PER_BLOCK / SERVER_FRAME_RATE;
      spatialSys.moveEntity_tween(action.playerId, v[0], v[1], t);
      return true;
    }
  }

  private _handlePlayerAction(action: PlayerAction): boolean {
    console.log("Game logic: Handling player action");

    switch (action.type) {
      case ActionType.MOVE: {
        return this._movePlayer(<MoveAction>action);
      }
    }

    return false;
  }
}
