import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityId } from "../common/system";
import { Circle } from "../common/geometry";
import { BLOCK_SZ } from "../common/constants";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";
import { CSpatial } from "../spatial_component";
import { GameEventType } from "../common/event";
import { EventHandlerFn, CBehaviour } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";

export function constructRock(em: EntityManager, desc: any): EntityId {
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

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   spatialSys.grid,
                                   gridModeProps,
                                   freeModeProps,
                                   shape);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    em.removeEntity(id);
  });

  const behaviourComp = new CBehaviour(id, targetedEvents);

  em.addEntity(id, EntityType.ROCK, desc, [ spatialComp, behaviourComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}
