import { Component, EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { GameError } from "./common/error";
import { GameEvent, EPlayerKilled, GameEventType, EEntityBurned,
         EAgentEnterCell, EEntityCollision, EGemsBanked, EAgentScoreChanged,
         EAwardGranted } from "./common/event";
import { EntityManager } from "./entity_manager";
import { Pinata } from "./pinata";
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
import { BLOCK_SZ } from "./common/constants";

const SCORE_THRESHOLDS = [ 10, 25, 50, 75 ];

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
  _lastDirectionMoved: Direction = Direction.DOWN;
  _score = 0;

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

  get lastDirectionMoved() {
    return this._lastDirectionMoved;
  }

  get score() {
    return this._score;
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

  async grantAward(entityId: EntityId, name: string): Promise<void> {
    const c = this.getComponent(entityId);
    let fetti = 0;

    this._logger.info(`Granting award ${name} to entity ${entityId}`);

    if (c.pinataToken !== undefined) {
      try {
        const response = await this._pinata.grantAward(name, c.pinataToken);
        fetti = response.fetti;
      }
      catch (err) {
        this._logger.error("Failed to grant award", err);
      }
    }

    const awardEvent: EAwardGranted = {
      type: GameEventType.AWARD_GRANTED,
      entities: [ entityId ],
      playerId: entityId,
      name,
      fetti,
      loggedOut: c.pinataToken === undefined
    };

    this._em.submitEvent(awardEvent);

    return Promise.resolve();
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
      case GameEventType.ENTITY_SQUASHED: {
        for (const entity of event.entities) {
          if (this.hasComponent(entity)) {
            this._explodeAgent(entity);
          }
        }
        break;
      }
      case GameEventType.PLAYER_KILLED: {
        this._onPlayerKilled(event);
        break;
      }
      case GameEventType.AGENT_ENTER_CELL: {
        this._onAgentEnterCell(event);
        break;
      }
      case GameEventType.ENTITY_BURNED: {
        for (const entity of event.entities) {
          if (this.hasComponent(entity)) {
            this._explodeAgent(entity);
          }
        }
        break;
      }
      case GameEventType.ENTITY_COLLISION: {
        this._onEntityCollision(event);
        break;
      }
      case GameEventType.GEMS_BANKED: {
        this._onGemsBanked(event);
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

  private _onGemsBanked(e: GameEvent) {
    const event = <EGemsBanked>e;
    const c = this.getComponent(event.playerId);

    const oldScore = c.score;

    c._score += event.numGems;

    const scoreChanged: EAgentScoreChanged = {
      type: GameEventType.AGENT_SCORE_CHANGED,
      entities: [ c.entityId ],
      agentId: c.entityId,
      score: c.score
    };

    this._em.submitEvent(scoreChanged);

    if (event.numGems == 5) {
      this.grantAward(c.entityId, "full_load");
    }

    for (let i = 0; i < SCORE_THRESHOLDS.length; ++i) {
      const threshold = SCORE_THRESHOLDS[i];
      if (oldScore < threshold && c.score >= threshold) {
        this.grantAward(c.entityId, `high_score_${i}`);
        break;
      }
    }
  }

  private _onEntityCollision(e: GameEvent) {
    const event = <EEntityCollision>e;
    if (this.hasComponent(event.entityA) && this.hasComponent(event.entityB)) {
      this._killBoth(event.entityA, event.entityB);
    }
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
        if (c._input.states[UserInput.UP] == InputState.PRESSED) {
          if (spatialSys.moveAgent(c.entityId, Direction.UP)) {
            c._lastDirectionMoved = Direction.UP;
          }
        }
        if (c._input.states[UserInput.RIGHT] == InputState.PRESSED) {
          if (spatialSys.moveAgent(c.entityId, Direction.RIGHT)) {
            c._lastDirectionMoved = Direction.RIGHT;
          }
        }
        if (c._input.states[UserInput.DOWN] == InputState.PRESSED) {
          if (spatialSys.moveAgent(c.entityId, Direction.DOWN)) {
            c._lastDirectionMoved = Direction.DOWN;
          }
        }
        if (c._input.states[UserInput.LEFT] == InputState.PRESSED) {
          if (spatialSys.moveAgent(c.entityId, Direction.LEFT)) {
            c._lastDirectionMoved = Direction.LEFT;
          }
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
        const c = this._components.get(action.playerId);
        if (c) {
          c._input.states[userInput.input] = userInput.state;
        }
        break;
      }
    }
  }

  private _explodeAgent(id: EntityId) {
    if (this._em.isPendingDeletion(id)) {
      return;
    }

    const spatialSys = <SpatialSystem>this._em.getSystem(ComponentType.SPATIAL);
    const spatialComp = spatialSys.getComponent(id);

    const x = spatialComp.x_abs + BLOCK_SZ * 0.5;
    const y = spatialComp.y_abs + BLOCK_SZ * 0.5;
    const r = BLOCK_SZ;

    const entities = spatialSys.entitiesWithinRadius(x, y, r);
    entities.delete(id);

    const burned: EEntityBurned = {
      type: GameEventType.ENTITY_BURNED,
      entities: Array.from(entities)
    };

    const killed: EPlayerKilled = {
      type: GameEventType.PLAYER_KILLED,
      entities: [id],
      playerId: id
    };

    this._em.submitEvent(killed);
    this._em.submitEvent(burned);
  }

  private _killBoth(agentA: EntityId, agentB: EntityId) {
    const inventory =
    <CCollector>this._em.getComponent(ComponentType.INVENTORY, agentA);

    const otherInventory =
      <CCollector>this._em.getComponent(ComponentType.INVENTORY, agentB);

    const gems = otherInventory.bucketValue("gems");

    inventory.addToBucket("gems", gems);
    otherInventory.clearBucket("gems");

    this._explodeAgent(agentB);
  }

  private _onAgentEnterCell(e: GameEvent) {
    const event = <EAgentEnterCell>e;

    const otherAgent = event.entities.find(id => id !== event.entityId &&
                                           this.hasComponent(id));

    if (otherAgent) {
      this._killBoth(event.entityId, otherAgent);
    }
  }
}
