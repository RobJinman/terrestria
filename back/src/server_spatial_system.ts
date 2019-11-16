import { SpatialComponentPacket, SpatialSystem, directionToVector,
         SpatialComponent} from "./common/spatial_system";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { EntityId } from "./common/system";
import { BLOCK_SZ, FALL_SPEED, PLAYER_SPEED } from "./common/constants";
import { GameEventType, EAgentEnterCell, EEntitySquashed, EAgentAction,
         AgentActionType} from "./common/event";
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

  update() {
    super.update();
    this._gravity();
  }

  moveAgent(id: EntityId, direction: Direction): boolean {
    const c = this.getComponent(id);
    if (!c.isAgent) {
      throw new GameError("Entity is not agent");
    }

    const oldDestGridX = this.grid.toGridX(c.destX);
    const oldDestGridY = this.grid.toGridY(c.destY);

    let moved = this._moveAgent(c, direction);

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

  private _em() {
    return <ServerEntityManager>(this.em);
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

  private _moveAgentIntoFreeSpace(id: EntityId,
                                  destX: number,
                                  destY: number,
                                  direction: Direction) {
    const t = 1.0 / PLAYER_SPEED;
    if (this.positionEntity_tween(id, destX, destY, t)) {
      const solid = this.grid.solidItemsAtPos(destX, destY);
      if (solid.size > 1) { // The player is solid
        const event: EAgentAction = {
          type: GameEventType.AGENT_ACTION,
          actionType: AgentActionType.DIG,
          agentId: id,
          entities: [...solid].map(c => c.entityId),
          direction
        };

        this._em().submitEvent(event);
      }
      else {
        const event: EAgentAction = {
          type: GameEventType.AGENT_ACTION,
          actionType: AgentActionType.RUN,
          agentId: id,
          entities: [id],
          direction
        };

        this._em().submitEvent(event);
      }

      return true;
    }
    return false;
  }

  private _moveAgentIntoBlockedSpace(id: EntityId,
                                     item: SpatialComponent,
                                     destX: number,
                                     destY: number,
                                     direction: Direction) {
    let moved = false;
    if (item.movable) {
      const t = 1.0 / PLAYER_SPEED;

      if (direction == Direction.LEFT) {
        const xLeft = item.destX - BLOCK_SZ;
        const y = item.destY;
        if (this.grid.spaceFreeAtPos(xLeft, y)) {
          this.stopEntity(item.entityId);
          this.positionEntity_tween(item.entityId, xLeft, y, t);
          moved = this.positionEntity_tween(id, destX, destY, t);
        }
      }
      else if (direction == Direction.RIGHT) {
        const xRight = item.destX + BLOCK_SZ;
        const y = item.destY;
        if (this.grid.spaceFreeAtPos(xRight, y)) {
          this.stopEntity(item.entityId);
          this.positionEntity_tween(item.entityId, xRight, y, t);
          moved = this.positionEntity_tween(id, destX, destY, t);
        }
      }

      if (moved) {
        const event: EAgentAction = {
          type: GameEventType.AGENT_ACTION,
          actionType: AgentActionType.PUSH,
          agentId: id,
          entities: [id, item.entityId],
          direction
        };

        this._em().submitEvent(event);
      }
    }
    return moved;
  }

  private _moveAgent(c: SpatialComponent, direction: Direction) {
    const delta = directionToVector(direction);

    const destX = c.x + delta[0];
    const destY = c.y + delta[1];

    if (this.grid.outOfRange(destX, destY)) {
      return false;
    }

    let moved = false;

    const blocking = this.grid.blockingItemsAtPos(destX, destY);
    if (blocking.size === 0) {
      moved = this._moveAgentIntoFreeSpace(c.entityId,
                                           destX,
                                           destY,
                                           direction);
    }
    else if (blocking.size === 1) {
      const item = blocking.values().next().value;
      moved = this._moveAgentIntoBlockedSpace(c.entityId,
                                              item,
                                              destX,
                                              destY,
                                              direction);
    }

    return moved;
  }
}
