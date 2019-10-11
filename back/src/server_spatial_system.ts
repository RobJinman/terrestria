import { SpatialComponentPacket, SpatialSystem, directionToVector,
         SpatialComponent} from "./common/spatial_system";
import { EntityManager } from "./common/entity_manager";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { EntityId } from "./common/system";
import { BLOCK_SZ, FALL_SPEED, PLAYER_SPEED } from "./common/config";
import { EAgentBeginMove, GameEventType,
         EAgentEnterCell } from "./common/event";
import { GameError } from "./common/error";
import { Direction } from "./common/definitions";

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

  private _gravity() {
    this.components.forEach(c => {
      if (c.heavy) {
        const yDown = c.y - BLOCK_SZ;
        const xRight = c.x + BLOCK_SZ;
        const xLeft = c.x - BLOCK_SZ;

        if (this.grid.spaceFreeAtPos(c.x, yDown)) {
          this.moveEntity_tween(c.entityId, 0, -BLOCK_SZ, 1.0 / FALL_SPEED);
        }
        else {
          if (!this.grid.stackableSpaceAtPos(c.x, yDown)) {
            if (this.grid.spaceFreeAtPos(xRight, c.y) &&
              this.grid.spaceFreeAtPos(xRight, yDown)) {

              this.moveEntity_tween(c.entityId, BLOCK_SZ, 0, 1.0 / FALL_SPEED);
            }
            else if (this.grid.spaceFreeAtPos(xLeft, c.y) &&
              this.grid.spaceFreeAtPos(xLeft, yDown)) {

              this.moveEntity_tween(c.entityId, -BLOCK_SZ, 0, 1.0 / FALL_SPEED);
            }
          }
        }
      }
    });
  }

  update() {
    super.update();
    this._gravity();
  }

  private _moveAgent(id: EntityId,
                     x: number,
                     y: number,
                     direction: Direction,
                     t: number): boolean {

    if (this.positionEntity_tween(id, x, y, t)) {
      const items = [...this.grid.atPos(x, y)].map(c => c.entityId);

      const event: EAgentBeginMove = {
        type: GameEventType.AGENT_BEGIN_MOVE,
        entities: new Set(items),
        entityId: id,
        direction: direction,
        gridX: Math.round(x / BLOCK_SZ),
        gridY: Math.round(y / BLOCK_SZ)
      };

      this.em.postEvent(event);

      return true;
    }

    return false;
  }

  moveAgent(id: EntityId, direction: Direction): boolean {
    const c = this.getComponent(id);
    if (!c.isAgent) {
      throw new GameError("Entity is not agent");
    }

    const delta = directionToVector(direction);

    const destX = c.x + delta[0];
    const destY = c.y + delta[1];

    if (this.grid.outOfRange(destX, destY)) {
      return false;
    }

    const oldDestGridX = this.grid.toGridX(c.destX);
    const oldDestGridY = this.grid.toGridY(c.destY);

    const t = 1.0 / PLAYER_SPEED;
    let moved = false;

    const blocking = this.grid.blockingItemsAtPos(destX, destY);
    if (blocking.size === 0) {
      moved = this._moveAgent(c.entityId, destX, destY, direction, t);
    }
    else if (blocking.size === 1) {
      const item: SpatialComponent = blocking.values().next().value;
      if (item.movable) {
        if (direction == Direction.LEFT) {
          const xLeft = item.destX - BLOCK_SZ;
          const y = item.destY;
          if (this.grid.spaceFreeAtPos(xLeft, y)) {
            this.stopEntity(item.entityId);
            this.positionEntity_tween(item.entityId, xLeft, y, t);
            moved = this._moveAgent(c.entityId, destX, destY, direction, t);
          }
        }
        else if (direction == Direction.RIGHT) {
          const xRight = item.destX + BLOCK_SZ;
          const y = item.destY;
          if (this.grid.spaceFreeAtPos(xRight, y)) {
            this.stopEntity(item.entityId);
            this.positionEntity_tween(item.entityId, xRight, y, t);
            moved = this._moveAgent(c.entityId, destX, destY, direction, t);
          }
        }
      }
    }

    if (moved) {
      const newDestGridX = this.grid.toGridX(c.destX);
      const newDestGridY = this.grid.toGridY(c.destY);

      if (newDestGridX != oldDestGridX || newDestGridY != oldDestGridY) {
        const items = [...this.grid.inCell(newDestGridX, newDestGridY)]
        .map(c => c.entityId);

        const event: EAgentEnterCell = {
          type: GameEventType.AGENT_ENTER_CELL,
          entityId: c.entityId,
          entities: new Set(items),
          prevGridX: oldDestGridX,
          prevGridY: oldDestGridY,
          gridX: newDestGridX,
          gridY: newDestGridY
        };

        this.em.postEvent(event);
      }
    }

    return moved;
  }
}
