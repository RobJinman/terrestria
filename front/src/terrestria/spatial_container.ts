import { clamp, addToMapOfSets, addToMapOfArrays } from "./common/utils";
import { EntityId } from "./common/system";

const CELL_SZ = 100;

export class SpatialContainer {
  private _gridW = 0;
  private _gridH = 0;
  private _grid: Set<PIXI.DisplayObject>[][];
  private _entityItems = new Map<EntityId, Set<PIXI.DisplayObject>>();
  private _itemLocations = new Map<PIXI.DisplayObject, [ number, number ][]>();

  constructor(worldW: number, worldH: number) {
    this._gridW = Math.ceil(worldW / CELL_SZ);
    this._gridH = Math.ceil(worldH / CELL_SZ);

    this._grid = [];
    for (let i = 0; i < this._gridW; ++i) {
      const col: Set<PIXI.DisplayObject>[] = [];
      for (let j = 0; j < this._gridH; ++j) {
        col.push(new Set<PIXI.DisplayObject>());
      }
      this._grid.push(col);
    }
  }

  itemsInRegion(x: number,
                y: number,
                w: number,
                h: number): Set<PIXI.DisplayObject> {
    const items = new Set<PIXI.DisplayObject>();

    const [ x0, y0, x1, y1 ] = this._worldRectToGridCoords(x, y, w, h);

    for (let i = x0; i <= x1; ++i) {
      for (let j = y0; j <= y1; ++j) {
        const inCell = this._grid[i][j];
        inCell.forEach(item => items.add(item));
      }
    }

    return items;
  }

  removeItem(item: PIXI.DisplayObject) {
    const locations = this._itemLocations.get(item) || [];
    for (const [ i, j ] of locations) {
      this._grid[i][j].delete(item);
    }
    this._itemLocations.set(item, []);
  }

  addItem(entityId: EntityId,
          item: PIXI.DisplayObject,
          x: number,
          y: number,
          w: number,
          h: number) {
    this.removeItem(item);

    const [ x0, y0, x1, y1 ] = this._worldRectToGridCoords(x, y, w, h);

    for (let i = x0; i <= x1; ++i) {
      for (let j = y0; j <= y1; ++j) {
        this._grid[i][j].add(item);
        addToMapOfArrays(this._itemLocations, item, [ i, j ]);
        addToMapOfSets(this._entityItems, entityId, item);
      }
    }
  }

  removeAllItemsForEntity(entityId: EntityId) {
    const items = this._entityItems.get(entityId);
    if (items) {
      items.forEach(item => this.removeItem(item));
    }
  }

  private _worldRectToGridCoords(x: number, y: number, w: number, h: number) {
    let x0 = Math.floor(x / CELL_SZ);
    let x1 = Math.ceil((x + w) / CELL_SZ);
    let y0 = Math.floor(y / CELL_SZ);
    let y1 = Math.ceil((y + h) / CELL_SZ);

    x0 = clamp(x0, 0, this._gridW - 1);
    x1 = clamp(x1, 0, this._gridW - 1);
    y0 = clamp(y0, 0, this._gridH - 1);
    y1 = clamp(y1, 0, this._gridH - 1);

    return [ x0, y0, x1, y1 ];
  }
}
