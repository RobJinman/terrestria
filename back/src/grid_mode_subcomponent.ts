import { EntityId } from "./common/system";
import { Grid } from "./grid";
import { GridModeProperties } from "./grid_mode_properties";
import { BLOCK_SZ_WLD } from "./common/constants";
import { SpatialSubcomponent } from "./spatial_subcomponent";
import { Direction } from "./common/definitions";

function vectorToDirection(x: number, y: number): Direction|undefined {
  if (x * y === 0 && x + y !== 0) {
    if (x > 0) {
      return Direction.RIGHT;
    }
    if (x < 0) {
      return Direction.LEFT;
    }
    if (y > 0) {
      return Direction.DOWN;
    }
    if (y < 0) {
      return Direction.UP;
    }
  }

  return undefined;
}

export class GridModeSubcomponent extends SpatialSubcomponent {
  falling = false;

  private _entityId: EntityId;
  private _gridX: number = 0;
  private _gridY: number = 0;
  private _grid: Grid;
  private _properties: GridModeProperties;
  private _speed = 0;
  private _lockedUntil: number = -1;
  private _dirty = true;

  constructor(entityId: EntityId,
              grid: Grid,
              properties: GridModeProperties) {
    super(entityId);

    this._entityId = entityId;
    this._grid = grid;
    this._properties = properties;
  }

  id() {
    return this._entityId;
  }

  isDirty() {
    return this._dirty;
  }

  setClean() {
    this._dirty = false;
  }

  stop() {
    this._lockedUntil = -1;
  }

  moving() {
    if (this._lockedUntil == -1) {
      return false;
    }
    const now = (new Date()).getTime();
    return now < this._lockedUntil;
  }

  // x and y are absolute
  setGridPos(x: number, y: number, noModeTransition = false): boolean {
    if (this.moving()) {
      return false;
    }

    if (x != this._gridX || y != this._gridY) {     
      const oldX = this._gridX;
      const oldY = this._gridY;

      const dx = x - oldX;
      const dy = y - oldY;

      const direction = vectorToDirection(dx, dy);

      const destX = x * BLOCK_SZ_WLD;
      const destY = y * BLOCK_SZ_WLD;

      if (!noModeTransition && this._grid.gravRegion.contains(x, y)) {
        if (this._grid.attemptModeTransitionFn(this._entityId,
                                               destX,
                                               destY,
                                               direction)) {
          return false;
        }
      }

      this._gridX = x;
      this._gridY = y;

      this._grid.onItemMoved(this, oldX, oldY, x, y);

      this._dirty = true;
    }

    return true;
  }

  setInstantaneousPos(x: number, y: number) {
    if (this.moving()) {
      return false;
    }

    const [ xAbs, yAbs ] = this._toAbsPos(x, y);

    const gridX = this._grid.toGridX(xAbs);
    const gridY = this._grid.toGridY(yAbs);
    this.setGridPos(gridX, gridY);

    return true;
  }

  setStaticPos(x: number, y: number) {
    this.stop();
    return this.setInstantaneousPos(x, y);
  }

  moveToPos(x: number, y: number, t: number) {
    if (this.moving()) {
      return false;
    }

    const dx = x - this.x();
    const dy = y - this.y();
    const s = Math.sqrt(dx * dx + dy * dy);
    this._speed = s / t;

    this.setStaticPos(x, y);

    const now = (new Date()).getTime();
    this._lockedUntil = now + t * 1000;

    return true;
  }

  get gridX() {
    return this._gridX;
  }

  get gridY() {
    return this._gridY;
  }

  x() {
    return this._gridX * BLOCK_SZ_WLD;
  }

  y() {
    return this._gridY * BLOCK_SZ_WLD;
  }

  get speed() {
    return this._speed;
  }

  get solid() {
    return this._properties.solid;
  }

  get blocking() {
    return this._properties.blocking;
  }

  get stackable() {
    return this._properties.stackable;
  }

  get squashable() {
    return this._properties.squashable;
  }

  get heavy() {
    return this._properties.heavy;
  }

  get movable() {
    return this._properties.movable;
  }

  get isAgent() {
    return this._properties.isAgent;
  }

  private _toAbsPos(x: number, y: number): [ number, number ] {
    if (this.parent) {
      return [ this.parent.x_abs() + x, this.parent.y_abs() + y ];
    }
    return [ x, y ];
  }
}
