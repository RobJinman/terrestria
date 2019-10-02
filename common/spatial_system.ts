import { ComponentType } from "./component_types";
import { BLOCK_SZ } from "./config";
import { ComponentPacket, Component, EntityId } from "./system";
import { Direction } from "./definitions";
import { GameError } from "./error";

export function directionToVector(dir: Direction) {
  switch (dir) {
    case Direction.UP: return [0, BLOCK_SZ];
    case Direction.RIGHT: return [BLOCK_SZ, 0];
    case Direction.DOWN: return [0, -BLOCK_SZ];
    case Direction.LEFT: return [-BLOCK_SZ, 0];
    default: return [0, 0];
  }
}

export type Vec2 = {
  x: number;
  y: number;
};

export interface SpatialComponentPacket extends ComponentPacket {
  x: number;
  y: number;
}

export interface PhysicalProperties {
  // If it blocks other objects (except agents) from occupying the same space
  solid: boolean;
  // If it blocks agents from occupying the same space
  blocking: boolean;
  // If it falls due to gravity (when there's no solid object supporting it)
  heavy: boolean;
  // If an agent can move it
  moveable: boolean;
  // If a playable agent
  isAgent: boolean;
}

export class SpatialComponent extends Component {
  dirty = true;
  private _pos: Vec2 = { x: 0, y: 0 };

  private _solid: boolean;
  private _blocking: boolean;
  private _heavy: boolean;
  private _moveable: boolean;
  private _isAgent: boolean;

  velocity: Vec2 = { x: 0, y: 0 };
  dest: Vec2 = { x: 0, y: 0 };

  falling = false;

  constructor(entityId: EntityId, properties: PhysicalProperties) {
    super(entityId, ComponentType.SPATIAL);

    this._solid = properties.solid;
    this._blocking = properties.blocking;
    this._heavy = properties.heavy;
    this._moveable = properties.moveable;
    this._isAgent = properties.isAgent;
  }

  moving() {
    return this.movingInX() || this.movingInY();
  }

  movingInX() {
    return Math.abs(this.velocity.x) > 0.5;
  }

  movingInY() {
    return Math.abs(this.velocity.y) > 0.5;
  }

  get x() {
    return this._pos.x;
  }

  set x(value: number) {
    this._pos.x = value;
    this.dirty = true;
  }

  get y() {
    return this._pos.y;
  }

  set y(value: number) {
    this._pos.y = value;
    this.dirty = true;
  }

  get pos() {
    return this._pos;
  }

  get solid() {
    return this._solid;
  }

  get blocking() {
    return this._blocking;
  }

  get heavy() {
    return this._heavy;
  }

  get moveable() {
    return this._moveable;
  }

  get isAgent() {
    return this._isAgent;
  }
}

export class Grid {
  _blockW: number;
  _blockH: number;
  _w: number;
  _h: number;
  _grid: Set<SpatialComponent>[][];

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
        this._grid[col][row] = new Set<SpatialComponent>();
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

  addItem(item: SpatialComponent) {
    const col = this.toGridX(item.x);
    const row = this.toGridY(item.y);
    this.inCell(col, row).add(item);
  }

  onItemMoved(item: SpatialComponent, oldX: number, oldY: number) {
    const oldCol = this.toGridX(oldX);
    const oldRow = this.toGridY(oldY);

    const newCol = this.toGridX(item.x);
    const newRow = this.toGridY(item.y);

    if (oldCol == newCol && oldRow == newRow) {
      return;
    }

    if (!this.inCell(oldCol, oldRow).delete(item)) {
      throw new GameError(`No such entity at position ${oldX}, ${oldY}`);
    }
  
    this.inCell(newCol, newRow).add(item);
  }

  removeItem(item: SpatialComponent): boolean {
    for (const col of this._grid) {
      for (const cell of col) {
        if (cell.delete(item)) {
          return true;
        }
      }
    }
 
    return false;
  }

  inCell(col: number, row: number): Set<SpatialComponent> {
    if (col < 0 || col > this._w - 1 || row < 0 || row > this._h - 1) {
      throw new GameError(`Cannot retrieve items in cell (${col}, ${row}). ` +
                          `Index out of range`);
    }
    return this._grid[col][row];
  }

  atPos(x: number, y: number): Set<SpatialComponent> {
    const col = this.toGridX(x);
    const row = this.toGridY(y);
    return this.inCell(col, row);
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

  blockingItemAtPos(x: number, y: number): boolean {
    const items = this.atPos(x, y);

    for (const c of items) {
      if (c.blocking) {
        return true;
      }
    }
    return false;
  }

  solidItemAtPos(x: number, y: number): boolean {
    const items = this.atPos(x, y);

    for (const c of items) {
      if (c.solid) {
        return true;
      }
    }
    return false;
  }
}
