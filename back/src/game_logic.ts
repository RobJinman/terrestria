import { PlayerAction, ActionType, UserInputAction, UserInput,
         InputState } from "./common/action";
import { ComponentType } from "./common/component_types";
import { EntityManager, getNextEntityId } from "./entity_manager";
import { EntityId } from "./common/system";
import { CBehaviour, EventHandlerFn } from "./common/behaviour_system";
import { GameEventType, GameEvent, EPlayerKilled } from "./common/event";
import { EntityType } from "./common/game_objects";
import { SpatialSystem } from "./spatial_system";
import { GameError } from "./common/error";
import { Direction } from "./common/definitions";
import { Logger } from "./logger";
import { SpatialMode } from "./common/spatial_packet";

const LOCK_DURATION_ON_FREE_MODE_TRANSITION = 200;

interface Input {
  states: Record<UserInput, InputState>;
  lockedUntil: number;
}

export class GameLogic {
  private _em: EntityManager;
  private _logger: Logger;
  private _entityId: EntityId = getNextEntityId();
  private _inputs = new Map<EntityId, Input>();

  constructor(em: EntityManager, logger: Logger) {
    this._em = em;
    this._logger = logger;

    const targetedHandlers = new Map<GameEventType, EventHandlerFn>();
    const broadcastHandlers = new Map<GameEventType, EventHandlerFn>();
    broadcastHandlers.set(GameEventType.PLAYER_KILLED,
                          event => this._onPlayerKilled(event));
    const behaviourComp = new CBehaviour(this._entityId,
                                         targetedHandlers,
                                         broadcastHandlers);

    em.addEntity(this._entityId, EntityType.OTHER, {}, [behaviourComp]);
  }

  update(actions: PlayerAction[]) {
    actions.forEach(action => {
      this._handlePlayerAction(action);
    });

    this._processUserInputs();
  }

  addPlayer(id: EntityId) {
    this._inputs.set(id, {
      states: {
        [UserInput.UP]: InputState.RELEASED,
        [UserInput.RIGHT]: InputState.RELEASED,
        [UserInput.DOWN]: InputState.RELEASED,
        [UserInput.LEFT]: InputState.RELEASED
      },
      lockedUntil: 0
    });
  }

  removePlayer(id: EntityId) {
    this._inputs.delete(id);
  }

  private _onPlayerKilled(e: GameEvent) {
    const event = <EPlayerKilled>e;

    this._logger.info(`Player ${event.playerId} killed!`);

    this.removePlayer(event.playerId);
    this._em.removeEntity(event.playerId);
  }

  private _processUserInputs() {
    const now = (new Date()).getTime();

    const spatialSys =
      <SpatialSystem>this._em.getSystem(ComponentType.SPATIAL);

    this._inputs.forEach((input, playerId) => {
      const player = spatialSys.getComponent(playerId);
      const mode = player.currentMode;

      if (input.lockedUntil <= now) {
        input.lockedUntil = 0;

        if (input.states[UserInput.UP] == InputState.PRESSED) {
          spatialSys.moveAgent(playerId, Direction.UP);
        }
        if (input.states[UserInput.RIGHT] == InputState.PRESSED) {
          spatialSys.moveAgent(playerId, Direction.RIGHT);
        }
        if (input.states[UserInput.DOWN] == InputState.PRESSED) {
          spatialSys.moveAgent(playerId, Direction.DOWN);
        }
        if (input.states[UserInput.LEFT] == InputState.PRESSED) {
          spatialSys.moveAgent(playerId, Direction.LEFT);
        }

        if (player.currentMode == SpatialMode.FREE_MODE &&
          player.currentMode != mode) {

          input.lockedUntil = (new Date()).getTime() +
                              LOCK_DURATION_ON_FREE_MODE_TRANSITION;
        }
      }
    });
  }

  private _handlePlayerAction(action: PlayerAction) {
    switch (action.type) {
      case ActionType.USER_INPUT: {
        const userInput = <UserInputAction>action;
        const input = this._inputs.get(action.playerId);
        if (!input) {
          throw new GameError("Error handling player action; Unrecognised " +
                              "player id");
        }
        input.states[userInput.input] = userInput.state;
        break;
      }
    }
  }
}
