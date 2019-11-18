import { ClientSystem } from "./common/client_system";
import { SpatialComponentPacket, SpatialSystem } from "./common/spatial_system";
import { EntityManager } from "./common/entity_manager";
import { EEntityMoved, GameEventType } from "./common/event";
import { EntityId } from "./common/system";
import { Span2d } from "./common/geometry";

export class ClientSpatialSystem extends SpatialSystem implements ClientSystem {
  constructor(em: EntityManager,
              w: number,
              h: number,
              frameRate: number) {

    const gravRegion = new Span2d();
    super(em, w, h, gravRegion, frameRate);
  }

  updateComponent(packet: SpatialComponentPacket) {
    const c = this.getComponent(packet.entityId);
    // If the entity is moving
    if (packet.speed > 0.1) {
      c.gridMode.setDestination(packet.destX, packet.destY, packet.speed);
    }
    else {
      this.positionEntity(packet.entityId, packet.destX, packet.destY);
    }
  }

  positionEntity(id: EntityId, x: number, y: number) {
    super.positionEntity(id, x, y);

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entities: [id],
      entityId: id,
      x: x,
      y: y
    };

    this.em.postEvent(event);
  }
}
