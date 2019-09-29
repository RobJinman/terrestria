import { EntityManager } from "./common/entity_manager";
import { RNewEntities } from "./common/response";
import { EntityType } from "./common/game_objects";
import { SpatialComponent } from "./common/spatial_system";
import { RenderComponent } from "./render_system";
import { AgentComponent } from "./common/agent_system";
import { EntityId } from "./common/system";

function constructGem(em: EntityManager, id: EntityId) {
  const renderComp = new RenderComponent(id, "gem");
  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    heavy: true,
    moveable: false,
    isAgent: false
  });

  em.addEntity(id, EntityType.GEM, [ spatialComp, renderComp ]);
}

function constructRock(em: EntityManager, id: EntityId) {
  const renderComp = new RenderComponent(id, "rock");
  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: true,
    heavy: true,
    moveable: true,
    isAgent: false
  });

  em.addEntity(id, EntityType.ROCK, [ spatialComp, renderComp ]);
}

function constructSoil(em: EntityManager, id: EntityId) {
  const renderComp = new RenderComponent(id, "soil");
  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    heavy: false,
    moveable: false,
    isAgent: false
  });

  em.addEntity(id, EntityType.SOIL, [ spatialComp, renderComp ]);
}

function constructPlayer(em: EntityManager, id: EntityId) {
  const renderComp = new RenderComponent(id, "man");
  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    heavy: false,
    moveable: false,
    isAgent: true
  });
  const agentComp = new AgentComponent(id, "", "");

  em.addEntity(id, EntityType.PLAYER, [ spatialComp,
                                        agentComp,
                                        renderComp ]);
}

export function constructEntities(entityManager: EntityManager,
                                  response: RNewEntities) {
  response.entities.forEach(entity => {
    switch (entity.type) {
      case EntityType.PLAYER:
        constructPlayer(entityManager, entity.id);
        break;
      case EntityType.GEM:
        constructGem(entityManager, entity.id);
        break;
      case EntityType.ROCK:
        constructRock(entityManager, entity.id);
        break;
      case EntityType.SOIL:
        constructSoil(entityManager, entity.id);
        break;
    }
  });
}
