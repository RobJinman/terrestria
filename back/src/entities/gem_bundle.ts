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
import { BLOCK_SZ_WLD } from "../common/constants";

export function constructGemBundle(em: EntityManager, desc: any): EntityId {
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
    { x: BLOCK_SZ_WLD / 2, y: 0 },
    { x: BLOCK_SZ_WLD, y: BLOCK_SZ_WLD / 2 },
    { x: BLOCK_SZ_WLD / 2, y: BLOCK_SZ_WLD },
    { x: 0, y: BLOCK_SZ_WLD / 2 }
  ];
  const shape = new Polygon(points);

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   false,
                                   spatialSys.grid,
                                   gridModeProps,
                                   freeModeProps,
                                   shape);

  const invComp = new CCollectable(id, "gems", desc.value);
  const behaviourComp = new CBehaviour(id);

  em.addEntity(id, EntityType.GEM_BUNDLE, desc, [ spatialComp,
                                                  invComp,
                                                  behaviourComp ]);

  addCollectableBehaviour(em, id, EntityType.GEM_BUNDLE);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}
