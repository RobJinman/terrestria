import { ClientSystem } from "./common/client_system";
import { SpatialComponent, SpatialComponentPacket,
         SpatialSystem } from "./common/spatial_system";
import { EntityManager } from "./common/entity_manager";
import { EEntityMoved, GameEventType } from "./common/event";
import { EntityId, ComponentPacket } from "./common/system";
import { ComponentType } from "./common/component_types";

export class ClientSpatialSystem extends SpatialSystem implements ClientSystem {
  constructor(em: EntityManager,
              w: number,
              h: number,
              frameRate: number) {
    super(em, w, h, frameRate);
  }

  updateComponent(packet: SpatialComponentPacket) {
    const c = this.getComponent(packet.entityId);
    if (c.destX != packet.destX || c.destY != packet.destY) {
      // If the entity is moving
      if (packet.speed > 0.1) {
        const dx = packet.x - c.x;
        const dy = packet.y - c.y;
        // If we're behind, increase the speed so we can catch up
        const multiplier = Math.max(1.0, Math.sqrt(dx * dx + dy * dy) * 0.1);

        c.setDestination(this.grid,
                         packet.destX,
                         packet.destY,
                         packet.speed * multiplier);
      }
      else {
        this.stopEntity(packet.entityId);
        this.positionEntity_tween(packet.entityId, packet.x, packet.y, 0.2);
      }
    }
    c.dirty = false;
  }

  getUnverified() {
    const unverified: ComponentPacket[] = [];
    for (let [id, c] of this.components) {
      if (c.dirty) {
        unverified.push({
          entityId: id,
          componentType: ComponentType.SPATIAL
        });
      }
    }
    return unverified;
  }

  positionEntity(id: EntityId, x: number, y: number) {
    super.positionEntity(id, x, y);

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entities: new Set([id]),
      entityId: id,
      x: x,
      y: y
    };

    this.em.postEvent(event);
  }

  updateEntityPos(c: SpatialComponent) {
    super.updateEntityPos(c);

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entities: new Set([c.entityId]),
      entityId: c.entityId,
      x: c.x,
      y: c.y
    };

    this.em.postEvent(event);
  }
}
