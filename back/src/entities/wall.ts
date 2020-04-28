import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityId, Component } from "../common/system";
import { Rectangle } from "../common/geometry";
import { BLOCK_SZ_WLD } from "../common/constants";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";
import { CSpatial } from "../spatial_component";
import { GameEventType } from "../common/event";
import { EventHandlerFn, CBehaviour } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";

export function constructDestructableWall(em: EntityManager, desc: any): EntityId {
  return constructWall(em, desc, true);
}

export function constructMetalWall(em: EntityManager, desc: any): EntityId {
  return constructWall(em, desc, false);
}

function constructWall(em: EntityManager, desc: any, destructable: boolean) {
  const id = getNextEntityId();

  const gridModeProps = {
    solid: true,
    blocking: true,
    stackable: true,
    squashable: false,
    heavy: false,
    movable: false,
    isAgent: false
  };

  const freeModeProps = {
    heavy: false,
    fixedAngle: false
  };

  const shape = new Rectangle(BLOCK_SZ_WLD, BLOCK_SZ_WLD);

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   false,
                                   spatialSys.grid,
                                   gridModeProps,
                                   freeModeProps,
                                   shape);

  const components: Component[] = [ spatialComp ];

  if (destructable) {
    const targetedEvents = new Map<GameEventType, EventHandlerFn>();
    targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
      em.removeEntity(id);
    });

    const behaviourComp = new CBehaviour(id, targetedEvents);

    components.push(behaviourComp);
  }

  const type = destructable ? EntityType.WALL : EntityType.METAL_WALL;
  em.addEntity(id, type, desc, components);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}
