import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityId } from "../common/system";
import { DEFAULT_FREE_MODE_PROPS } from "../free_mode_properties";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";
import { CSpatial } from "../spatial_component";
import { DEFAULT_GRID_MODE_PROPS } from "../grid_mode_properties";
import { SpatialMode } from "../common/spatial_packet";
import { EntityType } from "../common/game_objects";
import { constructAd } from "./advert";

export function constructBillboardL(em: EntityManager, desc: any): EntityId {
  return constructBillboard(em, desc, EntityType.BILLBOARD_L);
}

export function constructBillboardR(em: EntityManager, desc: any): EntityId {
  return constructBillboard(em, desc, EntityType.BILLBOARD_R);
}

function constructBillboard(em: EntityManager,
                            desc: any,
                            type: EntityType): EntityId {
  const id = getNextEntityId();

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   false,
                                   spatialSys.grid,
                                   DEFAULT_GRID_MODE_PROPS,
                                   DEFAULT_FREE_MODE_PROPS);

  spatialComp.currentMode = SpatialMode.FREE_MODE;

  em.addEntity(id, type, desc, [ spatialComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  const adId = constructAd(em, {
    adName: `billboard`, // TODO: Billboard index
    x: 0,
    y: 0
  });

  em.addChildToEntity(id, adId);

  return id;
}
