import { EntityManager, EntityId } from "../../../common/entity_manager";
import { RNewEntity } from "../../../common/response";
import { EntityType } from "../../../common/game_objects";
import { ComponentType } from "../../../common/component_types";
import { SpatialSystem,
         SpatialComponent } from "../../../common/spatial_system";
import { RenderSystem, RenderComponent } from "./render_system";
import { AgentSystem, AgentComponent } from "../../../common/agent_system";

function constructGem(em: EntityManager, id: EntityId) {
  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);
  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const spatialComp = new SpatialComponent(id);
  spatialSys.addComponent(spatialComp);

  const renderComp = new RenderComponent(id, "gem");
  renderSys.addComponent(renderComp);
}

function constructRock(em: EntityManager, id: EntityId) {
  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);
  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const spatialComp = new SpatialComponent(id);
  spatialSys.addComponent(spatialComp);

  const renderComp = new RenderComponent(id, "rock");
  renderSys.addComponent(renderComp);
}

function constructSoil(em: EntityManager, id: EntityId) {
  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);
  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const spatialComp = new SpatialComponent(id);
  spatialSys.addComponent(spatialComp);

  const renderComp = new RenderComponent(id, "soil");
  renderSys.addComponent(renderComp);
}

function constructPlayer(em: EntityManager, id: EntityId) {
  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);
  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);
  const agentSys = <AgentSystem>em.getSystem(ComponentType.AGENT);

  const spatialComp = new SpatialComponent(id);
  spatialSys.addComponent(spatialComp);

  const renderComp = new RenderComponent(id, "man");
  renderSys.addComponent(renderComp);

  const agentComp = new AgentComponent(id, "", "");
  agentSys.addComponent(agentComp);
}

export function constructEntities(entityManager: EntityManager,
                                  response: RNewEntity) {
  response.newEntities.forEach(newEntity => {
    switch (newEntity.entityType) {
      case EntityType.PLAYER:
        constructPlayer(entityManager, newEntity.entityId);
        break;
      case EntityType.GEM:
        constructGem(entityManager, newEntity.entityId);
        break;
      case EntityType.ROCK:
        constructRock(entityManager, newEntity.entityId);
        break;
      case EntityType.SOIL:
        constructSoil(entityManager, newEntity.entityId);
        break;
    }
  });
}
