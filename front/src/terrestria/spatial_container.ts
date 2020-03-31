import { GameError } from "./common/error";
import { clamp, inRange } from "./common/utils";

const CELL_SZ = 128;

export class SpatialContainer<T> {
  private _gridW = 0;
  private _gridH = 0;
  private _grid: Set<T>[][];

  constructor(worldW: number, worldH: number) {
    this._gridW = Math.ceil(worldW / CELL_SZ);
    this._gridH = Math.ceil(worldH / CELL_SZ);

    this._grid = [];
    for (let i = 0; i < this._gridW; ++i) {
      const col: Set<T>[] = [];
      for (let j = 0; j < this._gridH; ++j) {
        col.push(new Set<T>());
      }
      this._grid.push(col);
    }
  }

  itemsInRegion(x: number, y: number, w: number, h: number): Set<T> {
    const items = new Set<T>();

    if (!this._grid) {
      throw new GameError("Spatial system not initialised");
    }

    let x0 = Math.floor(x / CELL_SZ);
    let x1 = Math.ceil((x + w) / CELL_SZ);
    let y0 = Math.floor(y / CELL_SZ);
    let y1 = Math.ceil((y + h) / CELL_SZ);

    x0 = clamp(x0, 0, this._gridW - 1);
    x1 = clamp(x1, 0, this._gridW - 1);
    y0 = clamp(y0, 0, this._gridH - 1);
    y1 = clamp(y1, 0, this._gridH - 1);

    for (let i = x0; i <= x1; ++i) {
      for (let j = y0; j <= y1; ++j) {
        const inCell = this._grid[i][j];
        inCell.forEach(item => items.add(item));
      }
    }

    return items;
  }

  removeItem(id: T) {
    // TODO
    for (let i = 0; i < this._gridW; ++i) {
      for (let j = 0; j < this._gridH; ++j) {
        this._grid[i][j].delete(id);
      }
    }
  }

  addItem(id: T, x: number, y: number) {
    const gridX = Math.floor(x / CELL_SZ);
    const gridY = Math.floor(y / CELL_SZ);

    if (inRange(gridX, 0, this._gridW - 1) &&
        inRange(gridY, 0, this._gridH - 1)) {
      this._grid[gridX][gridY].add(id);
    }
  }
}
