import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityId } from "../common/system";
import { Circle, Shape, Rectangle } from "../common/geometry";
import { BLOCK_SZ } from "../common/constants";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";
import { CSpatial } from "../spatial_component";
import { GameEventType } from "../common/event";
import { EventHandlerFn, CBehaviour } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";

export function constructRoundRock(em: EntityManager, desc: any): EntityId {
  return constructRock(em, desc, false);
}

export function constructSquareRock(em: EntityManager, desc: any): EntityId {
  return constructRock(em, desc, true);
}

function constructRock(em: EntityManager,
                       desc: any,
                       square: boolean): EntityId {
  const id = getNextEntityId();

  const gridModeProps = {
    solid: true,
    blocking: true,
    stackable: square,
    squashable: false,
    heavy: true,
    movable: !square,
    isAgent: false
  };

  const freeModeProps = {
    heavy: true,
    fixedAngle: false
  };

  let shape: Shape;
  if (square) {
    shape = new Rectangle(BLOCK_SZ, BLOCK_SZ);
  }
  else {
    shape = new Circle(BLOCK_SZ * 0.5);
  }

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   false,
                                   spatialSys.grid,
                                   gridModeProps,
                                   freeModeProps,
                                   shape);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    em.removeEntity(id);
  });

  const behaviourComp = new CBehaviour(id, targetedEvents);

  const type = square ? EntityType.SQUARE_ROCK : EntityType.ROUND_ROCK;
  em.addEntity(id, type, desc, [ spatialComp, behaviourComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}
