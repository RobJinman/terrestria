import { ServerEntityManager, getNextEntityId } from "../server_entity_manager";
import { EntityId } from "../common/system";
import { ServerSpatialSystem } from "../server_spatial_system";
import { ComponentType } from "../common/component_types";
import { ServerSpatialComponent } from "../server_spatial_component";
import { GameEventType } from "../common/event";
import { EventHandlerFn, BehaviourComponent } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";

export function constructSoil(em: ServerEntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  const gridModeProps = {
    solid: true,
    blocking: false,
    stackable: true,
    squashable: false,
    heavy: false,
    movable: false,
    isAgent: false
  };

  const freeModeProps = {
    heavy: false,
    fixedAngle: true
  };

  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new ServerSpatialComponent(id,
                                                 spatialSys.grid,
                                                 gridModeProps,
                                                 freeModeProps);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_ENTER_CELL, e => {
    em.removeEntity(id);
  });
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    em.removeEntity(id);
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.SOIL, desc, [ spatialComp, behaviourComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}
