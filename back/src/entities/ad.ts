import { ServerEntityManager, getNextEntityId } from "../server_entity_manager";
import { EntityId } from "../common/system";
import { FreeModeProperties } from "../free_mode_properties";
import { ServerSpatialSystem } from "../server_spatial_system";
import { ComponentType } from "../common/component_types";
import { ServerSpatialComponent } from "../server_spatial_component";
import { DEFAULT_GRID_MODE_PROPS } from "../grid_mode_properties";
import { SpatialMode } from "../common/spatial_component_packet";
import { ServerAdComponent } from "../server_ad_system";
import { EntityType } from "../common/game_objects";

export function constructAd(em: ServerEntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  const freeModeProps: FreeModeProperties = {
    heavy: false,
    fixedAngle: false
  };

  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new ServerSpatialComponent(id,
                                                 spatialSys.grid,
                                                 DEFAULT_GRID_MODE_PROPS,
                                                 freeModeProps);

  spatialComp.currentMode = SpatialMode.FREE_MODE;

  const adComp = new ServerAdComponent(id, desc.adName);

  em.addEntity(id, EntityType.AD, desc, [ spatialComp, adComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}
