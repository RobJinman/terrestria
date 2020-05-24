import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityId } from "../common/system";
import { Circle } from "../common/geometry";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";
import { CSpatial } from "../spatial_component";
import { CCollectable } from "../inventory_system";
import { CBehaviour } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";
import { addCollectableBehaviour } from "./utils/collectables";
import { BLOCK_SZ_WLD } from "../common/constants";

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

  const shape = new Circle(BLOCK_SZ_WLD * 0.5);

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
