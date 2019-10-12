import { EntityManager } from "./common/entity_manager";
import { RNewEntities } from "./common/response";
import { EntityType } from "./common/game_objects";
import { SpatialComponent } from "./common/spatial_system";
import { RenderComponent } from "./render_system";
import { AgentComponent } from "./common/agent_system";
import { EntityId } from "./common/system";

function constructGem(em: EntityManager, id: EntityId) {
  const renderComp = new RenderComponent(id, "gem.png");
  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    stackable: false,
    heavy: true,
    movable: false,
    isAgent: false
  });

  em.addEntity(id, EntityType.GEM, [ spatialComp, renderComp ]);
}

function constructRock(em: EntityManager, id: EntityId) {
  const renderComp = new RenderComponent(id, "rock.png");
  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: true,
    stackable: false,
    heavy: true,
    movable: true,
    isAgent: false
  });

  em.addEntity(id, EntityType.ROCK, [ spatialComp, renderComp ]);
}

function constructSoil(em: EntityManager, id: EntityId) {
  const renderComp = new RenderComponent(id, "soil.png");
  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    stackable: true,
    heavy: false,
    movable: false,
    isAgent: false
  });

  em.addEntity(id, EntityType.SOIL, [ spatialComp, renderComp ]);
}

function constructPlayer(em: EntityManager, id: EntityId) {
  const renderComp = new RenderComponent(id, "man_run_d0.png");
  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    stackable: true,
    heavy: false,
    movable: false,
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
