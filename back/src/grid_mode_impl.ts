import { SpatialComponent } from "./spatial_component";
import { Grid } from "./grid";
import { BLOCK_SZ, FALL_SPEED, PLAYER_SPEED } from "./common/constants";
import { EntityId } from "./common/system";
import { GridModeSubcomponent } from "./grid_mode_subcomponent";
import { GameError } from "./common/error";
import { Vec2, normalise, directionToVector } from "./common/geometry";
import { EAgentEnterCell, GameEventType, EEntitySquashed, EAgentAction,
         AgentActionType } from "./common/event";
import { Direction } from "./common/definitions";
import { ServerEntityManager } from "./server_entity_manager";

export class GridModeImpl {
  private _em: ServerEntityManager;
  private _components = new Map<number, SpatialComponent>();
  private _grid: Grid;
  private _frameRate: number;

  constructor(entityManager: ServerEntityManager,
              w: number,
              h: number,
              frameRate: number) {
    this._em = entityManager;
    this._grid = new Grid(BLOCK_SZ, BLOCK_SZ, w, h);
    this._frameRate = frameRate;
  }

  setComponentsMap(components: Map<number, SpatialComponent>) {
    this._components = components;
  }

  get grid() {
    return this._grid;
  }

  getComponent(id: EntityId): GridModeSubcomponent {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No spatial component for entity ${id}`);
    }
    return c.gridMode;
  }

  update() {
    this._components.forEach(c => {
      if (c.gridMode.moving()) {
        this.updateEntityPos(c.gridMode);
      }
    });
    this._gravity();
  }

  updateEntityPos(c: GridModeSubcomponent) {
    const v: Vec2 = {
      x: c.destX - c.x(),
      y: c.destY - c.y()
    };
    normalise(v);

    const dx = v.x * c.speed / this._frameRate;
    const dy = v.y * c.speed / this._frameRate;

    c.setInstantaneousPos(c.x() + dx, c.y() + dy);

    const xDir = dx < 0 ? -1 : 1;
    const yDir = dy < 0 ? -1 : 1;
    const reachedDestX = xDir * (c.x() - c.destX) > -0.5;
    const reachedDestY = yDir * (c.y() - c.destY) > -0.5;

    if (reachedDestX && reachedDestY) {
      c.setStaticPos(c.destX, c.destY);
    }
  }

  finishTween(id: EntityId) {
    const c = this.getComponent(id);
    c.setStaticPos(c.destX, c.destY);
  }

  positionEntity_tween(id: EntityId, x: number, y: number, t: number): boolean {
    const c = this.getComponent(id);
    if (!c.moving()) {
      const dx = x - c.x();
      const dy = y - c.y();
      const s = Math.sqrt(dx * dx + dy * dy);
      c.setDestination(x, y, s / t);
      return true;
    }
    return false;
  }

  moveEntity_tween(id: EntityId, dx: number, dy: number, t: number): boolean {
    const c = this.getComponent(id);
    return this.positionEntity_tween(id, c.x() + dx, c.y() + dy, t);
  }

  entityIsMoving(id: EntityId) {
    const c = this.getComponent(id);
    return c.moving();
  }

  stopEntity(id: EntityId) {
    const c = this.getComponent(id);
    c.speed = 0;
  }

  onComponentAdded(c: SpatialComponent) {
    this._grid.addItem(c.gridMode);
  }

  onComponentRemoved(c: SpatialComponent) {
    this._grid.removeItem(c.gridMode);
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

        this._em.postEvent(event);
      }
    }

    return moved;
  }

  private _gravity() {
    this._components.forEach(c => {
      if (c.gridMode.heavy) {
        const x = c.gridMode.destX;
        const y = c.gridMode.destY;
        const yDown = y - BLOCK_SZ;
        const xRight = x + BLOCK_SZ;
        const xLeft = x - BLOCK_SZ;

        const t = 1.0 / FALL_SPEED;

        if (!this.grid.outOfRange(x, yDown)) {
          if (this.grid.spaceFreeAtPos(x, yDown)) {
            this.moveEntity_tween(c.entityId, 0, -BLOCK_SZ, t);
            c.gridMode.falling = true;
          }
          else {
            if (c.gridMode.falling) {
              const event: EEntitySquashed = {
                type: GameEventType.ENTITY_SQUASHED,
                entities: this.grid.idsAtPos(x, yDown),
                squasherId: c.entityId,
                gridX: this.grid.toGridX(x),
                gridY: this.grid.toGridY(yDown)
              };

              this._em.postEvent(event);
            }

            c.gridMode.falling = false;

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

        this._em.submitEvent(event);
      }
    }
    return moved;
  }

  private _moveAgent(c: GridModeSubcomponent, direction: Direction) {
    const delta = directionToVector(direction);

    const destX = c.x() + delta[0];
    const destY = c.y() + delta[1];

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