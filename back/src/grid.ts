import { GridModeSubcomponent } from "./grid_mode_subcomponent";
import { GameError } from "./common/error";
import { inRange, addSetToSet } from "./common/utils";
import { EntityId } from "./common/system";

export class Grid {
  _blockW: number;
  _blockH: number;
  _w: number;
  _h: number;
  _grid: Set<GridModeSubcomponent>[][];

  constructor(blockW: number,
              blockH: number,
              numBlocksX: number,
              numBlocksY: number) {
    this._blockW = blockW;
    this._blockH = blockH;
    this._w = numBlocksX;
    this._h = numBlocksY;
    this._grid = (new Array(numBlocksX));
    for (let col = 0; col < this._w; ++col) {
      this._grid[col] = (new Array(this._h));
      for (let row = 0; row < this._h; ++row) {
        this._grid[col][row] = new Set<GridModeSubcomponent>();
      }
    }
  }

  toGridX(x: number, w: number = this._blockW) {
    return Math.floor((x + 0.5 * w) / this._blockW);
  }

  toGridY(y: number, h: number = this._blockH) {
    return Math.floor((y + 0.5 * h) / this._blockH);
  }

  outOfRange(x: number, y: number): boolean {
    const col = this.toGridX(x);
    const row = this.toGridY(y);
    return col < 0 || col > this._w - 1 ||
           row < 0 || row > this._h - 1;
  }

  addItem(item: GridModeSubcomponent) {
    const col = this.toGridX(item.x());
    const row = this.toGridY(item.y());
    this.inCell(col, row).add(item);
  }

  onItemMoved(item: GridModeSubcomponent,
              oldX: number,
              oldY: number,
              newX: number,
              newY: number) {
    const oldCol = this.toGridX(oldX);
    const oldRow = this.toGridY(oldY);

    const newCol = this.toGridX(newX);
    const newRow = this.toGridY(newY);

    if (oldCol == newCol && oldRow == newRow) {
      return;
    }

    if (!this.inCell(oldCol, oldRow).delete(item)) {
      throw new GameError(`No such entity at position ${oldX}, ${oldY}`);
    }
  
    this.inCell(newCol, newRow).add(item);
  }

  removeItem(item: GridModeSubcomponent): boolean {
    for (const col of this._grid) {
      for (const cell of col) {
        if (cell.delete(item)) {
          return true;
        }
      }
    }
 
    return false;
  }

  inCell(col: number, row: number): Set<GridModeSubcomponent> {
    if (col < 0 || col > this._w - 1 || row < 0 || row > this._h - 1) {
      throw new GameError(`Cannot retrieve items in cell (${col}, ${row}). ` +
                          `Index out of range`);
    }
    return this._grid[col][row];
  }

  inCells(fromCol: number,
          toCol: number,
          fromRow: number,
          toRow: number): Set<GridModeSubcomponent> {
    const items = new Set<GridModeSubcomponent>();
    for (let c = fromCol; c <= toCol; ++c) {
      for (let r = fromRow; r <= toRow; ++r) {
        if (inRange(c, 0, this._w - 1) && inRange(r, 0, this._h - 1)) {
          addSetToSet(this.inCell(c, r), items);
        }
      }
    }
    return items;
  }

  idsInCells(fromCol: number,
             toCol: number,
             fromRow: number,
             toRow: number): EntityId[] {
    const items = this.inCells(fromCol, toCol, fromRow, toRow);
    return [...items].map(c => c.entityId);
  }

  idsInCell(col: number, row: number): EntityId[] {
    return [...this.inCell(col, row)].map(c => c.entityId);
  }

  atPos(x: number, y: number): Set<GridModeSubcomponent> {
    const col = this.toGridX(x);
    const row = this.toGridY(y);
    return this.inCell(col, row);
  }

  idsAtPos(x: number, y: number): EntityId[] {
    return [...this.atPos(x, y)].map(c => c.entityId);
  }

  dbg_print() {
    for (let i = 0; i < this._w; ++i) {
      let msg = "";
      for (let j = 0; j < this._h; ++j) {
        msg += this.inCell(i, j).size + " ";
      }
      console.log(msg);
    }
  }

  itemsWithPropAtPos(x: number, y: number, prop: string) {
    const allItems = this.atPos(x, y);
    const itemsWithProp = new Set<GridModeSubcomponent>();

    for (const item of allItems) {
      const c = <any>item;
      if (c[prop]) {
        itemsWithProp.add(item);
      }
    }

    return itemsWithProp;
  }

  blockingItemsAtPos(x: number, y: number) {
    return this.itemsWithPropAtPos(x, y, "blocking");
  }

  solidItemsAtPos(x: number, y: number) {
    return this.itemsWithPropAtPos(x, y, "solid");
  }

  stackableItemsAtPos(x: number, y: number) {
    return this.itemsWithPropAtPos(x, y, "stackable");
  }

  movableItemsAtPos(x: number, y: number) {
    return this.itemsWithPropAtPos(x, y, "movable");
  }

  spaceFreeAtPos(x: number, y: number): boolean {
    return !this.outOfRange(x, y) && this.solidItemsAtPos(x, y).size === 0;
  }

  stackableSpaceAtPos(x: number, y: number): boolean {
    if (this.toGridY(y) == -1) {
      return true;
    }
    return this.stackableItemsAtPos(x, y).size > 0;
  }
}