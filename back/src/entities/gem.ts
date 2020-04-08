import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityId } from "../common/system";
import { Polygon } from "../common/geometry";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";
import { CSpatial } from "../spatial_component";
import { CCollectable } from "../inventory_system";
import { CBehaviour } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";
import { addCollectableBehaviour } from "./utils/collectables";

export function constructGem(em: EntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  const gridModeProps = {
    solid: true,
    blocking: true,
    stackable: false,
    squashable: false,
    heavy: true,
    movable: false,
    isAgent: false
  };

  const freeModeProps = {
    heavy: true,
    fixedAngle: false
  };

  const points = [
    { x: 0, y: 20 },
    { x: 32, y: 64 },
    { x: 64, y: 20 },
    { x: 54, y: 0 },
    { x: 10, y: 0 }
  ];
  const shape = new Polygon(points);

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   false,
                                   spatialSys.grid,
                                   gridModeProps,
                                   freeModeProps,
                                   shape);

  const invComp = new CCollectable(id, "gems", 1);
  const behaviourComp = new CBehaviour(id);

  em.addEntity(id, EntityType.GEM, desc, [ spatialComp,
                                           invComp,
                                           behaviourComp ]);

  addCollectableBehaviour(em, id, EntityType.GEM);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}

