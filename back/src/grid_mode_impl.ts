import { Grid } from "./grid";
import { BLOCK_SZ, FALL_SPEED, PLAYER_SPEED } from "./common/constants";
import { EntityId } from "./common/system";
import { GridModeSubcomponent } from "./grid_mode_subcomponent";
import { GameError } from "./common/error";
import { directionToVector } from "./common/geometry";
import { EAgentEnterCell, GameEventType, EEntitySquashed, EAgentAction,
         AgentActionType } from "./common/event";
import { Direction } from "./common/definitions";
import { ServerEntityManager } from "./server_entity_manager";

export class GridModeImpl {
  private _em: ServerEntityManager;
  private _components = new Map<number, GridModeSubcomponent>();
  private _grid: Grid;

  constructor(entityManager: ServerEntityManager,
              w: number,
              h: number) {
    this._em = entityManager;
    this._grid = new Grid(entityManager, BLOCK_SZ, BLOCK_SZ, w, h);
  }

  get grid() {
    return this._grid;
  }

  getComponent(id: EntityId): GridModeSubcomponent {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No spatial component for entity ${id}`);
    }
    return c;
  }

  update() {
    this._gravity();
  }

  addComponent(c: GridModeSubcomponent) {
    this._components.set(c.entityId, c);
    this._grid.addItem(c);
  }

  removeComponent(c: GridModeSubcomponent) {
    this._grid.removeItem(c);
    this._components.delete(c.entityId);
  }

  moveAgent(id: EntityId, direction: Direction): boolean {
    const c = this.getComponent(id);
    if (!c.isAgent) {
      throw new GameError("Entity is not agent");
    }

    const oldDestGridX = c.gridX;
    const oldDestGridY = c.gridY;

    let moved = this._moveAgent(c, direction);

    if (moved) {
      const newDestGridX = c.gridX;
      const newDestGridY = c.gridY;

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

        this._em.postEvent(event);
      }
    }

    return moved;
  }

  private _gravity() {
    this._components.forEach(c => {
      if (c.heavy) {
        const x = c.x();
        const y = c.y();
        const yDown = y + BLOCK_SZ;
        const xRight = x + BLOCK_SZ;
        const xLeft = x - BLOCK_SZ;

        const t = 1.0 / FALL_SPEED;

        if (!this.grid.outOfRange(x, yDown)) {
          if (this.grid.spaceFreeAtPos(x, yDown)) {
            c.moveToPos(c.x(), c.y() + BLOCK_SZ, t);
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

              this._em.postEvent(event);
            }

            c.falling = false;

            if (!this.grid.stackableSpaceAtPos(x, yDown)) {
              if (this.grid.spaceFreeAtPos(xRight, y) &&
                this.grid.spaceFreeAtPos(xRight, yDown)) {

                c.moveToPos(c.x() + BLOCK_SZ, c.y(), t);
              }
              else if (this.grid.spaceFreeAtPos(xLeft, y) &&
                this.grid.spaceFreeAtPos(xLeft, yDown)) {

                c.moveToPos(c.x() - BLOCK_SZ, c.y(), t);
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
    const c = this.getComponent(id);

    if (c.moveToPos(destX, destY, t)) {
      const solid = this.grid.solidItemsAtPos(destX, destY);
      if (solid.size > 1) { // The player is solid
        const event: EAgentAction = {
          type: GameEventType.AGENT_ACTION,
          actionType: AgentActionType.DIG,
          agentId: id,
          entities: [...solid].map(c => c.entityId),
          direction
        };

        this._em.submitEvent(event);
      }
      else {
        const event: EAgentAction = {
          type: GameEventType.AGENT_ACTION,
          actionType: AgentActionType.RUN,
          agentId: id,
          entities: [id],
          direction
        };

        this._em.submitEvent(event);
      }

      return true;
    }
    return false;
  }

  private _moveAgentIntoBlockedSpace(id: EntityId,
                                     item: GridModeSubcomponent,
                                     destX: number,
                                     destY: number,
                                     direction: Direction) {
    const c = this.getComponent(id);
    let moved = false;
    if (item.movable) {
      const t = 1.0 / PLAYER_SPEED;

      if (direction == Direction.LEFT) {
        const xLeft = item.x() - BLOCK_SZ;
        const y = item.y();
        if (this.grid.spaceFreeAtPos(xLeft, y)) {
          item.stop();
          item.moveToPos(xLeft, y, t);
          moved = c.moveToPos(destX, destY, t);
        }
      }
      else if (direction == Direction.RIGHT) {
        const xRight = item.x() + BLOCK_SZ;
        const y = item.y();
        if (this.grid.spaceFreeAtPos(xRight, y)) {
          item.stop();
          item.moveToPos(xRight, y, t);
          moved = c.moveToPos(destX, destY, t);
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

        this._em.submitEvent(event);
      }
    }
    return moved;
  }

  private _moveAgent(c: GridModeSubcomponent, direction: Direction) {
    const delta = directionToVector(direction);

    const destX = c.x() + delta.x;
    const destY = c.y() + delta.y;

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