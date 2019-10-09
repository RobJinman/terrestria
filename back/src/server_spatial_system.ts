import { SpatialComponentPacket, SpatialSystem} from "./common/spatial_system";
import { EntityManager } from "./common/entity_manager";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { EntityId } from "./common/system";

export class ServerSpatialSystem extends SpatialSystem implements ServerSystem {
  constructor(em: EntityManager,
              w: number,
              h: number,
              frameRate: number) {
    super(em, w, h, frameRate);
  }

  getState() {
    const packets: SpatialComponentPacket[] = [];

    this.components.forEach((c, id) => {
      packets.push({
        componentType: ComponentType.SPATIAL,
        entityId: c.entityId,
        x: c.x,
        y: c.y,
        destX: c.destX,
        destY: c.destY,
        speed: c.speed
      });
    });

    return packets;
  }

  getComponentState(entityId: EntityId): SpatialComponentPacket|null {
    const c = this.components.get(entityId);

    if (c) {
      const packet: SpatialComponentPacket = {
        componentType: ComponentType.SPATIAL,
        entityId: c.entityId,
        x: c.x,
        y: c.y,
        destX: c.destX,
        destY: c.destY,
        speed: c.speed
      };
      return packet;
    }

    return null;
  }
}
