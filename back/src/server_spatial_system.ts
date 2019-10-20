import { SpatialComponentPacket, SpatialSystem, directionToVector,
         SpatialComponent} from "./common/spatial_system";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { EntityId } from "./common/system";
import { BLOCK_SZ, FALL_SPEED, PLAYER_SPEED } from "./common/constants";
import { EAgentBeginMove, GameEventType, EAgentEnterCell, EEntitySquashed, 
         EAgentAction, AgentActionType} from "./common/event";
import { GameError } from "./common/error";
import { Direction } from "./common/definitions";
import { ServerEntityManager } from "./server_entity_manager";

export class ServerSpatialSystem extends SpatialSystem implements ServerSystem {
  constructor(em: ServerEntityManager,
              w: number,
              h: number,
              frameRate: number) {
    super(em, w, h, frameRate);
  }

  private _em() {
    return <ServerEntityManager>(this.em);
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

  private _gravity() {
    this.components.forEach(c => {
      if (c.heavy) {
        const x = c.destX;
        const y = c.destY;
        const yDown = y - BLOCK_SZ;
        const xRight = x + BLOCK_SZ;
        const xLeft = x - BLOCK_SZ;

        const t = 1.0 / FALL_SPEED;

        if (!this.grid.outOfRange(x, yDown)) {
          if (this.grid.spaceFreeAtPos(x, yDown)) {
            this.moveEntity_tween(c.entityId, 0, -BLOCK_SZ, t);
            c.falling = true;
          }
          else {
            if (c.falling) {
              const event: EEntitySquashed = {
                type: GameEventType.ENTITY_SQUASHED,
                entities: this.grid.idsAtPos(x, yDown),
                squasherId: c.entityId,
                gridX: this.grid.toGridX(x),
                gridY: this.grid.toGridY(yDown)
              };

              this.em.postEvent(event);
            }

            c.falling = false;

            if (!this.grid.stackableSpaceAtPos(x, yDown)) {
              if (this.grid.spaceFreeAtPos(xRight, y) &&
                this.grid.spaceFreeAtPos(xRight, yDown)) {

                this.moveEntity_tween(c.entityId, BLOCK_SZ, 0, t);
              }
              else if (this.grid.spaceFreeAtPos(xLeft, y) &&
                this.grid.spaceFreeAtPos(xLeft, yDown)) {

                this.moveEntity_tween(c.entityId, -BLOCK_SZ, 0, t);
              }
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
      const items = this.grid.idsAtPos(x, y);

      const event: EAgentBeginMove = {
        type: GameEventType.AGENT_BEGIN_MOVE,
        entities: items,
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

      if (moved) {
        const solid = this.grid.solidItemsAtPos(destX, destY);
        if (solid.size > 1) { // The player is solid
          const event: EAgentAction = {
            type: GameEventType.AGENT_ACTION,
            actionType: AgentActionType.DIG,
            agentId: c.entityId,
            entities: [c.entityId].concat([...solid].map(c => c.entityId)),
            direction
          };

          this._em().submitEvent(event);
        }
        else {
          const event: EAgentAction = {
            type: GameEventType.AGENT_ACTION,
            actionType: AgentActionType.RUN,
            agentId: c.entityId,
            entities: [c.entityId],
            direction
          };

          this._em().submitEvent(event);
        }
      }
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

        if (moved) {
          const event: EAgentAction = {
            type: GameEventType.AGENT_ACTION,
            actionType: AgentActionType.PUSH,
            agentId: c.entityId,
            entities: [c.entityId, item.entityId],
            direction
          };

          this._em().submitEvent(event);
        }
      }
    }

    if (moved) {
      const newDestGridX = this.grid.toGridX(c.destX);
      const newDestGridY = this.grid.toGridY(c.destY);

      if (newDestGridX != oldDestGridX || newDestGridY != oldDestGridY) {
        const items = this.grid.idsInCell(newDestGridX, newDestGridY);

        const event: EAgentEnterCell = {
          type: GameEventType.AGENT_ENTER_CELL,
          entityId: c.entityId,
          entities: items,
          prevGridX: oldDestGridX,
          prevGridY: oldDestGridY,
          gridX: newDestGridX,
          gridY: newDestGridY,
          direction
        };

        this.em.postEvent(event);
      }
    }

    return moved;
  }
}
