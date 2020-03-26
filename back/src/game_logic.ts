import { PlayerAction, ActionType, UserInputAction, UserInput,
         InputState } from "./common/action";
import { ComponentType } from "./common/component_types";
import { EntityManager, getNextEntityId } from "./entity_manager";
import { EntityId } from "./common/system";
import { BehaviourComponent, EventHandlerFn } from "./common/behaviour_system";
import { GameEventType, GameEvent, EPlayerKilled } from "./common/event";
import { EntityType } from "./common/game_objects";
import { ServerSpatialSystem } from "./spatial_system";
import { GameError } from "./common/error";
import { Direction } from "./common/definitions";
import { Logger } from "./logger";

export class GameLogic {
  private _em: EntityManager;
  private _logger: Logger;
  private _entityId: EntityId = getNextEntityId();
  private _inputStates = new Map<EntityId, Record<UserInput, InputState>>();

  constructor(em: EntityManager, logger: Logger) {
    this._em = em;
    this._logger = logger;

    const targetedHandlers = new Map<GameEventType, EventHandlerFn>();
    const broadcastHandlers = new Map<GameEventType, EventHandlerFn>();
    broadcastHandlers.set(GameEventType.PLAYER_KILLED,
                          event => this._onPlayerKilled(event));
    const behaviourComp = new BehaviourComponent(this._entityId,
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
    this._inputStates.set(id, {
      [UserInput.UP]: InputState.RELEASED,
      [UserInput.RIGHT]: InputState.RELEASED,
      [UserInput.DOWN]: InputState.RELEASED,
      [UserInput.LEFT]: InputState.RELEASED
    });
  }

  removePlayer(id: EntityId) {
    this._inputStates.delete(id);
  }

  private _onPlayerKilled(e: GameEvent) {
    const event = <EPlayerKilled>e;

    this._logger.info(`Player ${event.playerId} killed!`);

    this.removePlayer(event.playerId);
    this._em.removeEntity(event.playerId);
  }

  private _processUserInputs() {
    const spatialSys =
      <ServerSpatialSystem>this._em.getSystem(ComponentType.SPATIAL);

    this._inputStates.forEach((states, playerId) => {
      const player = spatialSys.getComponent(playerId);
      const mode = player.currentMode;

      if (states[UserInput.UP] == InputState.PRESSED) {
        spatialSys.moveAgent(playerId, Direction.UP);
      }
      if (states[UserInput.RIGHT] == InputState.PRESSED) {
        spatialSys.moveAgent(playerId, Direction.RIGHT);
      }
      if (states[UserInput.DOWN] == InputState.PRESSED) {
        spatialSys.moveAgent(playerId, Direction.DOWN);
      }
      if (states[UserInput.LEFT] == InputState.PRESSED) {
        spatialSys.moveAgent(playerId, Direction.LEFT);
      }
/*
      if (player.currentMode == SpatialMode.FREE_MODE &&
        player.currentMode != mode) {

        states[UserInput.UP] = InputState.RELEASED;
        states[UserInput.RIGHT] = InputState.RELEASED;
        states[UserInput.DOWN] = InputState.RELEASED;
        states[UserInput.LEFT] = InputState.RELEASED;
      }*/
    });
  }

  private _handlePlayerAction(action: PlayerAction) {
    switch (action.type) {
      case ActionType.USER_INPUT: {
        const userInput = <UserInputAction>action;
        const states = this._inputStates.get(action.playerId);
        if (!states) {
          throw new GameError("Error handling player action; Unrecognised " +
                              "player id");
        }
        states[userInput.input] = userInput.state;
        break;
      }
    }
  }
}
