import { ComponentType } from "./component_types";
import { BLOCK_SZ } from "./config";
import { ComponentPacket, Component, EntityId } from "./system";
import { Direction } from "./definitions";
import { GameError } from "./error";
import { GameEvent } from "./event";

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

export class SpatialSystem {
  protected components: Map<number, SpatialComponent>;
  protected w = 0;
  protected h = 0;
  protected frameRate: number;
  protected grid: Grid;

  constructor(w: number, h: number, frameRate: number) {
    this.components = new Map<number, SpatialComponent>();

    this.w = w;
    this.h = h;
    this.frameRate = frameRate;

    this.grid = new Grid(BLOCK_SZ, BLOCK_SZ, w, h);
  }

  update() {
    this.components.forEach(c => {
      if (c.moving()) {
        this.updateEntityPos(c);
      }
    });
  }

  positionEntity(id: EntityId, x: number, y: number) {
    this.stopEntity(id);
    const c = this.getComponent(id);

    this.setEntityPos(c, x, y);
  }
  
  entityIsMoving(id: EntityId) {
    const c = this.getComponent(id);
    return c.moving();
  }

  addComponent(component: SpatialComponent) {
    this.components.set(component.entityId, component);
    this.grid.addItem(component);
  }

  hasComponent(id: EntityId) {
    return this.components.has(id);
  }

  getComponent(id: EntityId) {
    const c = this.components.get(id);
    if (!c) {
      throw new GameError(`No spatial component for entity ${id}`);
    }
    return c;
  }

  removeComponent(id: EntityId) {
    const c = this.components.get(id);
    if (c) {
      this.grid.removeItem(c);
    }
    this.components.delete(id);
  }

  stopEntity(id: EntityId) {
    const c = this.getComponent(id);
    c.velocity.x = 0;
    c.velocity.y = 0;
  }

  finishTween(id: EntityId) {
    const c = this.getComponent(id);
    this.setEntityPos(c, c.dest.x, c.dest.y);
    c.velocity.x = 0;
    c.velocity.y = 0;
  }

  numComponents() {
    return this.components.size;
  }

  handleEvent(event: GameEvent) {}

  get width() {
    return this.w;
  }

  get height() {
    return this.h;
  }

  moveEntity(id: EntityId, dx: number, dy: number) {
    const c = this.getComponent(id);
    this.positionEntity(id, c.x + dx, c.y + dy);
  }

  positionEntity_tween(id: EntityId, x: number, y: number, t: number): boolean {
    const c = this.getComponent(id);
    if (!c.moving()) {
      c.velocity.x = (x - c.x) / t;
      c.velocity.y = (y - c.y) / t;
      c.dest.x = x;
      c.dest.y = y;
      return true;
    }
    return false;
  }

  moveEntity_tween(id: EntityId, dx: number, dy: number, t: number): boolean {
    const c = this.getComponent(id);
    return this.positionEntity_tween(id, c.x + dx, c.y + dy, t);
  }

  protected updateEntityPos(c: SpatialComponent) {
    const dx = c.velocity.x / this.frameRate;
    const dy = c.velocity.y / this.frameRate;
    this.setEntityPos(c, c.x + dx, c.y + dy);

    const xDir = dx < 0 ? -1 : 1;
    const yDir = dy < 0 ? -1 : 1;
    const reachedDestX = xDir * (c.x - c.dest.x) > -0.5;
    const reachedDestY = yDir * (c.y - c.dest.y) > -0.5;

    if (reachedDestX && reachedDestY) {
      c.velocity.x = 0;
      c.velocity.y = 0;
      this.setEntityPos(c, c.dest.x, c.dest.y);
    }
  }

  protected setEntityPos(c: SpatialComponent, x: number, y: number) {
    const oldX = c.x;
    const oldY = c.y;

    c.x = x;
    c.y = y;

    this.grid.onItemMoved(c, oldX, oldY);
  }
}
