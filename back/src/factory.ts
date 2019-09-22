import { EntityId, getNextEntityId,
         EntityManager } from "./common/entity_manager";
import { ComponentType } from "./common/component_types";
import { AgentSystem, AgentComponent } from "./common/agent_system";
import { SpatialSystem, SpatialComponent } from "./common/spatial_system";

export function constructSoil(manager: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialSys = <SpatialSystem>manager.getSystem(ComponentType.SPATIAL);

  const spatialComp = new SpatialComponent(id);
  spatialSys.addComponent(spatialComp);

  return id;
}

export function constructRock(manager: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialSys = <SpatialSystem>manager.getSystem(ComponentType.SPATIAL);

  const spatialComp = new SpatialComponent(id);
  spatialSys.addComponent(spatialComp);

  return id;
}

export function constructGem(manager: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialSys = <SpatialSystem>manager.getSystem(ComponentType.SPATIAL);

  const spatialComp = new SpatialComponent(id);
  spatialSys.addComponent(spatialComp);

  return id;
}

export function constructPlayer(manager: EntityManager,
                                pinataId: string,
                                pinataToken: string): EntityId {
  const id = getNextEntityId();

  const agentSys = <AgentSystem>manager.getSystem(ComponentType.AGENT);
  const spatialSys = <SpatialSystem>manager.getSystem(ComponentType.SPATIAL);

  const agentComp = new AgentComponent(id, pinataId, pinataToken);
  agentSys.addComponent(agentComp);

  const spatialComp = new SpatialComponent(id);
  spatialSys.addComponent(spatialComp);

  return id;
}
