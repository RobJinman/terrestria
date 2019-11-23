import { EntityId } from "./common/system";
import { Grid } from "./grid";
import { GridModeProperties } from "./grid_mode_properties";
import { BLOCK_SZ } from "./common/constants";
import { SpatialSubcomponent } from "./spatial_subcomponent";

export class GridModeSubcomponent implements SpatialSubcomponent {
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
    this._entityId = entityId;
    this._grid = grid;
    this._properties = properties;
  }

  get entityId() {
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

  setGridPos(x: number, y: number) {
    if (this.moving()) {
      return false;
    }

    if (x != this._gridX || y != this._gridY) {
      const oldX = this._gridX;
      const oldY = this._gridY;

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

    const gridX = this._grid.toGridX(x);
    const gridY = this._grid.toGridY(y);
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
    return this._gridX * BLOCK_SZ;
  }

  y() {
    return this._gridY * BLOCK_SZ;
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

  get heavy() {
    return this._properties.heavy;
  }

  get movable() {
    return this._properties.movable;
  }

  get isAgent() {
    return this._properties.isAgent;
  }
}
