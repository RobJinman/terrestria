import { ClientSystem } from "./common/client_system";
import { SpatialComponent, SpatialComponentPacket, directionToVector,
         SpatialSystem } from "./common/spatial_system";
import { EntityManager } from "./common/entity_manager";
import { SERVER_FRAME_RATE } from "./common/config";
import { EEntityMoved, GameEventType } from "./common/event";
import { EntityId } from "./common/system";
import { GameError } from "./common/error";
import { Direction } from "./common/definitions";

export class ClientSpatialSystem extends SpatialSystem implements ClientSystem {
  private _em: EntityManager;

  constructor(entityManager: EntityManager,
              w: number,
              h: number,
              frameRate: number) {
    super(w, h, frameRate);
    this._em = entityManager;
  }

  updateComponent(packet: SpatialComponentPacket) {
    const c = this.getComponent(packet.entityId);
    this.stopEntity(c.entityId);
    //this.positionEntity(c.entityId,
    //                    packet.x,
    //                    packet.y);
    this.positionEntity_tween(c.entityId,
                              packet.x,
                              packet.y,
                              1.0 / SERVER_FRAME_RATE);
  }

  positionEntity(id: EntityId, x: number, y: number) {
    super.positionEntity(id, x, y);

    const c = this.getComponent(id);

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entities: new Set([c.entityId]),
      entityId: c.entityId,
      x: c.x,
      y: c.y
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
      const t = 0.2; // TODO
      this.moveEntity_tween(id, delta[0], delta[1], t);
    }
  }
}
