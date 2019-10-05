import { SpatialComponentPacket, directionToVector,
         SpatialSystem} from "./common/spatial_system";
import { EntityManager } from "./common/entity_manager";
import { BLOCK_SZ, PLAYER_SPEED } from "./common/config";
import { EntityId } from "./common/system";
import { GameEventType, EAgentBeginMove } from "./common/event";
import { ComponentType } from "./common/component_types";
import { GameError } from "./common/error";
import { Direction } from "./common/definitions";
import { ServerSystem } from "./common/server_system";

export class ServerSpatialSystem extends SpatialSystem implements ServerSystem {
  private _em: EntityManager;

  constructor(em: EntityManager,
              w: number,
              h: number,
              frameRate: number) {
    super(em, w, h, frameRate);

    this._em = em;
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

      const items = [...this.grid.atPos(destX, destY)].map(c => c.entityId);

      const event: EAgentBeginMove = {
        type: GameEventType.AGENT_BEGIN_MOVE,
        entities: new Set(items),
        entityId: id,
        direction: direction,
        gridX: Math.round(destX / BLOCK_SZ),
        gridY: Math.round(destY / BLOCK_SZ)
      };

      this._em.postEvent(event);
    }
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

  getDirties() {
    const dirties: SpatialComponentPacket[] = [];

    this.components.forEach((c, id) => {
      if (c.dirty) {
        dirties.push({
          entityId: c.entityId,
          componentType: ComponentType.SPATIAL,
          x: c.x,
          y: c.y,
          speed: c.speed,
          destX: c.destX,
          destY: c.destY
        });
        c.dirty = false;
      }
    });

    return dirties;
  }
}
