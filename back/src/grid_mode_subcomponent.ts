import { EntityId } from "./common/system";
import { Grid } from "./grid";
import { GridModeProperties } from "./grid_mode_properties";
import { BLOCK_SZ } from "./common/constants";
import { SpatialSubcomponent } from "./spatial_subcomponent";

export class GridModeSubcomponent implements SpatialSubcomponent {
  dirty = true;
  falling = false;

  private _entityId: EntityId;
  private _gridX: number = 0;
  private _gridY: number = 0;
  private _grid: Grid;
  private _properties: GridModeProperties;
  private _lockedUntil: number = -1;

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

  stop() {
    this._lockedUntil = -1;
  }

  moving() {
    return this._lockedUntil !== -1;
  }

  setGridPos(x: number, y: number) {
    // TODO: Check _lockedUntil

    if (x != this._gridX || y != this._gridY) {
      const oldX = this._gridX;
      const oldY = this._gridY;

      this._gridX = x;
      this._gridY = y;
    
      this._grid.onItemMoved(this, oldX, oldY, x, y);

      this.dirty = true;
    }

    return true; // TODO
  }

  setInstantaneousPos(x: number, y: number) {
    // TODO: Check _lockedUntil

    const gridX = this._grid.toGridX(x);
    const gridY = this._grid.toGridY(y);
    this.setGridPos(gridX, gridY);

    return true; // TODO
  }

  setStaticPos(x: number, y: number) {
    // The same until we introduce a notion of time
    return this.setInstantaneousPos(x, y);
  }

  moveToPos(x: number, y: number, t: number) {
    this.setStaticPos(x, y);
    //const now = (new Date()).getTime();
    //this._lockedUntil = now + t * 1000;

    return true; // TODO
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