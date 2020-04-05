import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityId } from "../common/system";
import { CAgent } from "../agent_system";
import { Circle } from "../common/geometry";
import { BLOCK_SZ } from "../common/constants";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";
import { CSpatial } from "../spatial_component";
import { CCollector, Bucket } from "../inventory_system";
import { EntityType } from "../common/game_objects";

export function constructPlayer(em: EntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  const agentComp = new CAgent(id, desc.pinataId, desc.pinataToken);

  const gridModeProps = {
    solid: true,
    blocking: false,
    stackable: true,
    squashable: true,
    heavy: false,
    movable: false,
    isAgent: true
  };

  const freeModeProps = {
    heavy: true,
    fixedAngle: true
  };

  const shape = new Circle(BLOCK_SZ * 0.5);

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   false,
                                   spatialSys.grid,
                                   gridModeProps,
                                   freeModeProps,
                                   shape);

  const invComp = new CCollector(id);
  invComp.addBucket(new Bucket("gems", 5));
  invComp.addBucket(new Bucket("trophies", -1));

  em.addEntity(id, EntityType.PLAYER, {}, [ spatialComp,
                                            agentComp,
                                            invComp ]);

  return id;
}
