import { ServerEntityManager, getNextEntityId } from "../server_entity_manager";
import { EntityId } from "../common/system";
import { Circle } from "../common/geometry";
import { BLOCK_SZ } from "../common/constants";
import { ServerSpatialSystem } from "../server_spatial_system";
import { ComponentType } from "../common/component_types";
import { ServerSpatialComponent } from "../server_spatial_component";
import { GameEventType } from "../common/event";
import { EventHandlerFn, BehaviourComponent } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";

export function constructRock(em: ServerEntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  const gridModeProps = {
    solid: true,
    blocking: true,
    stackable: false,
    squashable: false,
    heavy: true,
    movable: true,
    isAgent: false
  };

  const freeModeProps = {
    heavy: true,
    fixedAngle: false
  };

  const shape = new Circle(BLOCK_SZ * 0.5);

  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new ServerSpatialComponent(id,
                                                 spatialSys.grid,
                                                 gridModeProps,
                                                 freeModeProps,
                                                 shape);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    em.removeEntity(id);
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.ROCK, desc, [ spatialComp, behaviourComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}
