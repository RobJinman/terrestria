import { EntityId, getNextEntityId,
         EntityManager } from "./common/entity_manager";
import { AgentComponent } from "./common/agent_system";
import { SpatialComponent } from "./common/spatial_system";
import { EntityType } from "./common/game_objects";

export function constructSoil(em: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialComp = new SpatialComponent(id, false);
  em.addEntity(id, EntityType.SOIL, [ spatialComp ]);

  return id;
}

export function constructRock(em: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialComp = new SpatialComponent(id, true);
  em.addEntity(id, EntityType.ROCK, [ spatialComp ]);

  return id;
}

export function constructGem(em: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialComp = new SpatialComponent(id, true);
  em.addEntity(id, EntityType.GEM, [ spatialComp ]);

  return id;
}

export function constructPlayer(em: EntityManager,
                                pinataId: string,
                                pinataToken: string): EntityId {
  const id = getNextEntityId();

  const agentComp = new AgentComponent(id, pinataId, pinataToken);
  const spatialComp = new SpatialComponent(id, true);

  em.addEntity(id, EntityType.PLAYER, [ spatialComp, agentComp ]);

  return id;
}
