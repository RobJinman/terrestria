import { Component, EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { GameError } from "./common/error";
import { GameEvent, EPlayerKilled, GameEventType } from "./common/event";
import { EntityManager } from "./entity_manager";
import { Pinata, CreateAwardResponse } from "./pinata";
import { PlayerAction, UserInput, InputState, ActionType,
         UserInputAction } from "./common/action";
import { EntityFactory } from "./entity_factory";
import { Pipe } from "./pipe";
import { Logger } from "./logger";
import { CSpatial } from "./spatial_component";
import { CCollector } from "./inventory_system";
import { EntityDesc } from "./common/map_data";
import { EntityType } from "./common/game_objects";
import { RNewEntities, GameResponseType } from "./common/response";
import { SpatialSystem } from "./spatial_system";
import { Direction } from "./common/definitions";
import { SpatialMode } from "./common/spatial_packet";

const LOCK_DURATION_ON_FREE_MODE_TRANSITION = 200;

interface Input {
  states: Record<UserInput, InputState>;
  lockedUntil: number;
}

export class CAgent extends Component {
  dirty: boolean = true;
  private _pinataId?: string;
  private _pinataToken?: string;
  _input: Input; // Non-private so AgentSystem has access

  constructor(entityId: EntityId, pinataId?: string, pinataToken?: string) {
    super(entityId, ComponentType.AGENT);

    this._pinataId = pinataId;
    this._pinataToken = pinataToken;

    this._input = {
      states: {
        [UserInput.UP]: InputState.RELEASED,
        [UserInput.RIGHT]: InputState.RELEASED,
        [UserInput.DOWN]: InputState.RELEASED,
        [UserInput.LEFT]: InputState.RELEASED
      },
      lockedUntil: 0
    };
  }

  get pinataId() {
    return this._pinataId;
  }

  get pinataToken() {
    return this._pinataToken;
  }
}

export class AgentSystem implements ServerSystem {
  private _components: Map<number, CAgent>;
  private _em: EntityManager;
  private _pinata: Pinata;
  private _actionQueue: PlayerAction[] = [];
  private _factory: EntityFactory;
  private _pipe: Pipe;
  private _logger: Logger;

  constructor(em: EntityManager,
              factory: EntityFactory,
              pipe: Pipe,
              pinata: Pinata,
              logger: Logger) {
    this._components = new Map<number, CAgent>();
    this._em = em;
    this._factory = factory;
    this._pipe = pipe;
    this._logger = logger;
    this._pinata = pinata;
  }

  addChildToEntity(id: EntityId, childId: EntityId) {}

  removeChildFromEntity(id: EntityId, childId: EntityId) {}

  async grantAward(entityId: EntityId,
                   name: string): Promise<CreateAwardResponse|null> {
    const c = this.getComponent(entityId);
    if (c.pinataToken) {
      const response = await this._pinata.grantAward(name, c.pinataToken);
      return response;
    }
    return Promise.resolve(null);
  }

  onPlayerAction(action: PlayerAction) {
    this._actionQueue.push(action);
  }

  numComponents() {
    return this._components.size;
  }

  addComponent(component: CAgent) {
    this._components.set(component.entityId, component);
  }

  hasComponent(id: EntityId) {
    return this._components.has(id);
  }

  getComponent(id: EntityId) {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No agent component for entity ${id}`);
    }
    return c;
  }

  removeComponent(id: EntityId) {
    this._components.delete(id);
  }

  handleEvent(event: GameEvent) {
    switch (event.type) {
      case GameEventType.PLAYER_KILLED: {
        this._onPlayerKilled(event);
        break;
      }
    }
  }

  update() {
    this._actionQueue.forEach(action => {
      this._handlePlayerAction(action);
    });

    this._processUserInputs();

    this._actionQueue = [];
  }

  getState() {
    return [];
  }

  getDirties() {
    return [];
  }

  private _onPlayerKilled(e: GameEvent) {
    const event = <EPlayerKilled>e;

    const spatialComp = <CSpatial>this._em.getComponent(ComponentType.SPATIAL,
                                                        event.playerId);
    const inventoryComp =
      <CCollector>this._em.getComponent(ComponentType.INVENTORY,
                                        event.playerId);

    const gems = inventoryComp.bucketValue("gems");

    this._logger.info(`Player ${event.playerId} died with ${gems} gems`);

    if (gems > 0) {
      const desc: EntityDesc = {
        type: EntityType.GEM_BUNDLE,
        data: {
          x: spatialComp.x,
          y: spatialComp.y,
          value: gems
        }
      };

      const bundleId = this._factory.constructEntity(desc);

      const newGemResponse: RNewEntities = {
        type: GameResponseType.NEW_ENTITIES,
        entities: [{
          id: bundleId,
          type: EntityType.GEM_BUNDLE,
          desc: desc.data
        }]
      };

      this._pipe.sendToAll(newGemResponse);
    }

    this._em.removeEntity(event.playerId);
  }

  private _processUserInputs() {
    const now = (new Date()).getTime();

    const spatialSys =
      <SpatialSystem>this._em.getSystem(ComponentType.SPATIAL);

    this._components.forEach(c => {
      const spatialComp = spatialSys.getComponent(c.entityId);
      const mode = spatialComp.currentMode;

      if (c._input.lockedUntil <= now) {
        c._input.lockedUntil = 0;

        let direction: Direction|null = null;
        if (c._input.states[UserInput.UP] == InputState.PRESSED) {
          direction = Direction.UP;
        }
        if (c._input.states[UserInput.RIGHT] == InputState.PRESSED) {
          direction = Direction.RIGHT;
        }
        if (c._input.states[UserInput.DOWN] == InputState.PRESSED) {
          direction = Direction.DOWN;
        }
        if (c._input.states[UserInput.LEFT] == InputState.PRESSED) {
          direction = Direction.LEFT;
        }

        if (direction !== null) {
          spatialSys.moveAgent(c.entityId, direction);
        }

        if (spatialComp.currentMode == SpatialMode.FREE_MODE &&
          spatialComp.currentMode != mode) {

          c._input.lockedUntil = (new Date()).getTime() +
                                 LOCK_DURATION_ON_FREE_MODE_TRANSITION;
        }
      }
    });
  }

  private _handlePlayerAction(action: PlayerAction) {
    switch (action.type) {
      case ActionType.USER_INPUT: {
        const userInput = <UserInputAction>action;
        const c = this.getComponent(action.playerId);
        c._input.states[userInput.input] = userInput.state;
        break;
      }
    }
  }
}
