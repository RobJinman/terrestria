import { ClientSystem } from "./common/client_system";
import { SpatialComponent, SpatialComponentPacket, directionToVector,
         SpatialSystem } from "./common/spatial_system";
import { EntityManager } from "./common/entity_manager";
import { PLAYER_SPEED } from "./common/config";
import { EEntityMoved, GameEventType } from "./common/event";
import { EntityId } from "./common/system";
import { GameError } from "./common/error";
import { Direction } from "./common/definitions";

export class ClientSpatialSystem extends SpatialSystem implements ClientSystem {
  private _em: EntityManager;

  constructor(em: EntityManager,
              w: number,
              h: number,
              frameRate: number) {
    super(em, w, h, frameRate);
    this._em = em;
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

    this._em.postEvent(event);
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

    this._em.postEvent(event);
  }

  moveAgent(id: EntityId, direction: Direction) {
    const c = this.getComponent(id);
    if (!c.isAgent) {
      throw new GameError("Entity is not agent");
    }

    const delta = directionToVector(direction);

    const destX = c.x + delta[0];
    const destY = c.y + delta[1];

    if (this.grid.outOfRange(destX, destY)) {
      return;
    }

    if (!this.grid.blockingItemAtPos(destX, destY)) {
      const t = 1.0 / PLAYER_SPEED;
      this.moveEntity_tween(id, delta[0], delta[1], t);
    }
  }
}
