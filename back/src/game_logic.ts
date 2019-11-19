import { PlayerAction, ActionType, MoveAction } from "./common/action";
import { ComponentType } from "./common/component_types";
import { ServerEntityManager } from "./server_entity_manager";
import { EntityId } from "./common/system";
import { getNextEntityId } from "./common/entity_manager";
import { BehaviourComponent, EventHandlerFn } from "./common/behaviour_system";
import { GameEventType, GameEvent, EPlayerKilled } from "./common/event";
import { EntityType } from "./common/game_objects";
import { SpatialSystem } from "./spatial_system";

export class GameLogic {
  private _em: ServerEntityManager;
  private _queuedAction: PlayerAction|null = null;
  private _entityId: EntityId = getNextEntityId();

  constructor(em: ServerEntityManager) {
    this._em = em;

    const targetedHandlers = new Map<GameEventType, EventHandlerFn>();
    const broadcastHandlers = new Map<GameEventType, EventHandlerFn>();
    broadcastHandlers.set(GameEventType.PLAYER_KILLED,
                          event => this._onPlayerKilled(event));
    const behaviourComp = new BehaviourComponent(this._entityId,
                                                 targetedHandlers,
                                                 broadcastHandlers);

    em.addEntity(this._entityId, EntityType.OTHER, [behaviourComp]);
  }

  private _onPlayerKilled(e: GameEvent) {
    const event = <EPlayerKilled>e;

    console.log(`Player ${event.playerId} killed!`);

    this._em.removeEntity(event.playerId);
  }

  update(actions: PlayerAction[]) {
    if (this._queuedAction) {
      try {
        if (this._handlePlayerAction(this._queuedAction)) {
          this._queuedAction = null;
        }
      }
      catch (err) {
        this._queuedAction = null;
        throw err;
      }
    }

    actions.forEach(action => {
      if (!this._handlePlayerAction(action)) {
        this._queuedAction = action;
      }
    });
  }

  private _movePlayer(action: MoveAction): boolean {
    const spatialSys = <SpatialSystem>this._em.getSystem(ComponentType.SPATIAL);

    // TODO: Free mode

    if (spatialSys.gridMode(action.playerId) &&
        spatialSys.gm_entityIsMoving(action.playerId)) {

      this._queuedAction = action;
      return false;
    }
    else {
      spatialSys.moveAgent(action.playerId, action.direction);
      return true;
    }
  }

  private _handlePlayerAction(action: PlayerAction): boolean {
    switch (action.type) {
      case ActionType.MOVE: {
        return this._movePlayer(<MoveAction>action);
      }
    }

    return false;
  }
}
