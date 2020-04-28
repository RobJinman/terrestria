import { Grid } from "./grid";
import { BLOCK_SZ_WLD, FALL_SPEED, PLAYER_SPEED } from "./common/constants";
import { EntityId } from "./common/system";
import { GridModeSubcomponent } from "./grid_mode_subcomponent";
import { GameError } from "./common/error";
import { directionToVector, vecMult } from "./common/geometry";
import { EAgentEnterCell, GameEventType, EEntitySquashed, EAgentAction,
         AgentActionType, EEntityHit, EAgentBlocked } from "./common/event";
import { Direction } from "./common/definitions";
import { EntityManager } from "./entity_manager";
import { SpatialModeImpl, AttemptModeTransitionFn } from "./spatial_mode_impl";
import { Span2d } from "./common/span";
import { ComponentType } from "./common/component_types";
import { Logger } from "./logger";

export class GridModeImpl implements SpatialModeImpl {
  private _em: EntityManager;
  private _components = new Map<number, GridModeSubcomponent>();
  private _grid: Grid;

  constructor(entityManager: EntityManager,
              w: number,
              h: number,
              gravRegion: Span2d,
              attemptModeTransitionFn: AttemptModeTransitionFn,
              logger: Logger) {
    this._em = entityManager;
    this._grid = new Grid(BLOCK_SZ_WLD,
                          BLOCK_SZ_WLD,
                          w,
                          h,
                          gravRegion,
                          attemptModeTransitionFn,
                          logger);
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

  addComponent(c: GridModeSubcomponent,
               x: number,
               y: number,
               direction?: Direction): boolean {
    this._components.set(c.entityId, c);

    this._grid.addItem(c);

    if (this._em.getSystem(ComponentType.AGENT).hasComponent(c.entityId)) {
      if (!direction) {
        throw new GameError("Must supply direction when entity is agent");
      }

      const v = directionToVector(direction);

      const gridX = this._grid.toGridX(x) - v.x;
      const gridY = this._grid.toGridX(y) - v.y;

      c.setGridPos(gridX, gridY, true);

      if (!this.moveAgent(c.entityId, direction)) {
        this.removeComponent(c);
        return false;
      }
    }
    else {
      c.setStaticPos(x, y);
    }

    return true;
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

    if (this._moveAgent(c, direction)) {
      this._postAgentMovedEvent(c, direction);
      return true;
    }
    else {
      return false;
    }
  }

  entitiesWithinRadius(x: number, y: number, r: number): Set<EntityId> {
    const entities = new Set<EntityId>();

    // Assume square area instead of circle, for simplicity

    const x0 = this.grid.toGridX(x - r);
    const x1 = this.grid.toGridX(x + r);
    const y0 = this.grid.toGridY(y - r);
    const y1 = this.grid.toGridY(y + r);

    const components = this.grid.inCells(x0, x1, y0, y1);
    for (const c of components) {
      entities.add(c.entityId);
    }

    return entities;
  }

  private _postAgentMovedEvent(c: GridModeSubcomponent,
                               direction: Direction) {
    const newDestGridX = c.gridX;
    const newDestGridY = c.gridY;

    const items = this.grid.idsInCell(newDestGridX, newDestGridY);

    const event: EAgentEnterCell = {
      type: GameEventType.AGENT_ENTER_CELL,
      entityId: c.entityId,
      entities: items,
      gridX: newDestGridX,
      gridY: newDestGridY,
      direction
    };

    this._em.postEvent(event);
  }

  private _postAgentBlockedEvent(c: GridModeSubcomponent,
                                 direction: Direction,
                                 destX: number,
                                 destY: number,
                                 blockedBy: EntityId[]) {
    const event: EAgentBlocked = {
      type: GameEventType.AGENT_BLOCKED,
      entityId: c.entityId,
      entities: blockedBy,
      gridX: destX,
      gridY: destY,
      direction
    };

    this._em.postEvent(event);
  }

  private _canFallIntoPos(x: number, y: number, falling: boolean) {
    if (this._grid.outOfRange(x, y)) {
      return false;
    }

    const solidItems = this._grid.solidItemsAtPos(x, y);
    const fallingItems = this._grid.fallingItemsAtPos(x, y);

    if (!falling) {
      // If none of the solid items is falling, return false
      for (const item of solidItems) {
        if (!fallingItems.has(item)) {
          return false;
        }
      }

      return true;
    }
    else {
      const squashableItems = this._grid.squashableItemsAtPos(x, y);

      // If none of the solid items is squashable or falling, return false
      for (const item of solidItems) {
        if (!(squashableItems.has(item) || fallingItems.has(item))) {
          return false;
        }
      }
  
      return true;
    }
  }

  private _gravity() {
    this._components.forEach(c => {
      if (!c.heavy) {
        return;
      }

      const x = c.x();
      const y = c.y();
      const yDown = y + BLOCK_SZ_WLD;
      const xRight = x + BLOCK_SZ_WLD;
      const xLeft = x - BLOCK_SZ_WLD;

      const squashable = this._grid.squashableItemsAtPos(x, y);
      if (c.falling && squashable.size > 0) {
        const event: EEntitySquashed = {
          type: GameEventType.ENTITY_SQUASHED,
          entities: Array.from(squashable).map(i => i.entityId),
          squasherId: c.entityId,
          gridX: this.grid.toGridX(x),
          gridY: this.grid.toGridY(y)
        };

        this._em.postEvent(event);
      }

      if (this.grid.outOfRange(x, yDown)) {
        c.falling = false;
        return;
      }

      const t = 1.0 / FALL_SPEED;

      if (this._canFallIntoPos(x, yDown, c.falling)) {
        c.moveToPos(c.x(), c.y() + BLOCK_SZ_WLD, t);
        c.falling = true;
      }
      else {
        if (c.falling) {
          const event: EEntityHit = {
            type: GameEventType.ENTITY_HIT,
            entities: this.grid.idsAtPos(x, yDown),
            hitterId: c.entityId,
            gridX: this.grid.toGridX(x),
            gridY: this.grid.toGridY(yDown)
          };

          this._em.submitEvent(event);
        }

        c.falling = false;

        if (!this.grid.stackableSpaceAtPos(x, yDown)) {
          if (this.grid.spaceFreeAtPos(xRight, y) &&
            this.grid.spaceFreeAtPos(xRight, yDown)) {

            c.moveToPos(c.x() + BLOCK_SZ_WLD, c.y(), t);
          }
          else if (this.grid.spaceFreeAtPos(xLeft, y) &&
            this.grid.spaceFreeAtPos(xLeft, yDown)) {

            c.moveToPos(c.x() - BLOCK_SZ_WLD, c.y(), t);
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
        const xLeft = item.x() - BLOCK_SZ_WLD;
        const y = item.y();
        if (this.grid.spaceFreeAtPos(xLeft, y)) {
          item.stop();
          item.moveToPos(xLeft, y, t);
          moved = c.moveToPos(destX, destY, t);
        }
      }
      else if (direction == Direction.RIGHT) {
        const xRight = item.x() + BLOCK_SZ_WLD;
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
    if (c.moving()) {
      return false;
    }

    const delta = vecMult(directionToVector(direction), BLOCK_SZ_WLD);

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

    if (!moved) {
      const blockingIds = Array.from(blocking).map(c => c.entityId);
      this._postAgentBlockedEvent(c, direction, destX, destY, blockingIds);
    }

    return moved;
  }
}