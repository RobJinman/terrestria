import { getNextEntityId, EntityManager } from "./common/entity_manager";
import { AgentComponent } from "./common/agent_system";
import { SpatialComponent } from "./common/spatial_system";
import { EntityType } from "./common/game_objects";
import { GameEventType } from "./common/event";
import { BehaviourComponent, EventHandlerFn } from "./behaviour_system";
import { EntityId } from "./common/system";

export function constructSoil(em: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    heavy: false,
    moveable: false,
    isAgent: false
  });

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_BEGIN_MOVE, e => em.removeEntity(id));

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.SOIL, [ spatialComp, behaviourComp ]);

  return id;
}

export function constructRock(em: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: true,
    heavy: true,
    moveable: true,
    isAgent: false
  });

  em.addEntity(id, EntityType.ROCK, [ spatialComp ]);

  return id;
}

export function constructGem(em: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    heavy: true,
    moveable: false,
    isAgent: false
  });

  em.addEntity(id, EntityType.GEM, [ spatialComp ]);

  return id;
}

export function constructPlayer(em: EntityManager,
                                pinataId: string,
                                pinataToken: string): EntityId {
  const id = getNextEntityId();

  const agentComp = new AgentComponent(id, pinataId, pinataToken);
  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    heavy: false,
    moveable: false,
    isAgent: true
  });

  em.addEntity(id, EntityType.PLAYER, [ spatialComp, agentComp ]);

  return id;
}
