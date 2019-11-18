import { ComponentType } from "./component_types";
import { BLOCK_SZ } from "./constants";
import { ComponentPacket, Component, EntityId } from "./system";
import { Direction } from "./definitions";
import { GameError } from "./error";
import { GameEvent, EEntityMoved, GameEventType } from "./event";
import { EntityManager, Entity } from "./entity_manager";
import { inRange, addSetToSet } from "./utils";
import { Span2d } from "./geometry";

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

export function normalise(v: Vec2) {
  const s = Math.sqrt(v.x * v.x + v.y * v.y);
  if (s !== 0) {
    v.x /= s;
    v.y /= s;
  }
  else {
    v.x = 0.70710678118;
    v.y = 0.70710678118;
  }
}

export interface SpatialComponentPacket extends ComponentPacket {
  x: number;
  y: number;
  destX: number;
  destY: number;
  speed: number;
}

export interface GridModeProperties {
  // If it blocks other objects (except agents) from occupying the same space
  solid: boolean;
  // If it blocks agents from occupying the same space
  blocking: boolean;
  // If it falls due to gravity (when there's no solid object supporting it)
  heavy: boolean;
  // If an agent can move it
  movable: boolean;
  // If other items can be stacked on top without rolling off
  stackable: boolean;
  // If the entity is an agent
  isAgent: boolean;
}

export interface FreeModeProperties {
  heavy: boolean;
}

abstract class SpatialSubcomponent {
  abstract x(): number;
  abstract y(): number;
  // Set position without changing destination or speed
  abstract setInstantaneousPos(x: number, y: number): void;
  // Set the position and stop the entity moving
  abstract setStaticPos(x: number, y: number): void;
}

export class GridModeSubcomponent implements SpatialSubcomponent {
  dirty = true;
  falling = false;

  private _entityId: EntityId;
  private _speed: number = 0; // Pixels per second
  private _posX: number = 0;
  private _posY: number = 0;
  private _destX: number = 0;
  private _destY: number = 0;
  private _em: EntityManager;
  private _grid: Grid;
  private _properties: GridModeProperties;

  constructor(entityId: EntityId,
              entityManager: EntityManager,
              grid: Grid,
              properties: GridModeProperties) {
    this._entityId = entityId;
    this._em = entityManager;
    this._grid = grid;
    this._properties = properties;
  }

  moving() {
    return this._speed > 0.1;
  }

  get entityId() {
    return this._entityId;
  }

  get speed() {
    return this._speed;
  }

  set speed(value: number) {
    if (value != this._speed) {
      this._speed = value;
      this.dirty = true;
    }
  }

  setInstantaneousPos(x: number, y: number) {
    this._posX = x;
    this._posY = y;

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entities: [this.entityId],
      entityId: this.entityId,
      x,
      y
    };

    this._em.postEvent(event);
  }

  setStaticPos(x: number, y: number) {
    this.setInstantaneousPos(x, y);
    this.setDestination(x, y, 0);
  }

  setDestination(x: number, y: number, speed: number) {
    const oldDestX = this._destX;
    const oldDestY = this._destY;

    this._destX = x;
    this._destY = y;
    this.speed = speed;

    if (oldDestX != x || oldDestY != y) {
      this.dirty = true;
      this._grid.onItemMoved(this,
                             oldDestX,
                             oldDestY,
                             this._destX,
                             this._destY);
    }
  }

  x() {
    return this._posX;
  }

  y() {
    return this._posY;
  }

  get destX() {
    return this._destX;
  }

  get destY() {
    return this._destY;
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

export class FreeModeSubcomponent implements SpatialSubcomponent {
  dirty = true;

  private _properties: FreeModeProperties;
  private _posX = 0;
  private _posY = 0;

  constructor(properties: FreeModeProperties) {
    this._properties = properties;
  }

  setInstantaneousPos(x: number, y: number) {
    // TODO
  }

  setStaticPos(x: number, y: number) {
    // TODO
  }

  x() {
    return this._posX;
  }

  y() {
    return this._posY;
  }
}

export enum SpatialMode {
  GRID_MODE,
  FREE_MODE
}

export class SpatialComponent extends Component {
  currentMode: SpatialMode = SpatialMode.GRID_MODE;
  gridMode: GridModeSubcomponent;
  freeMode: FreeModeSubcomponent;

  constructor(entityId: EntityId,
              entityManager: EntityManager,
              grid: Grid,
              gridModeProperties: GridModeProperties,
              freeModeProperties: FreeModeProperties) {
    super(entityId, ComponentType.SPATIAL);

    this.gridMode = new GridModeSubcomponent(entityId,
                                             entityManager,
                                             grid,
                                             gridModeProperties);
    this.freeMode = new FreeModeSubcomponent(freeModeProperties);
  }

  isDirty() {
    return this.gridMode.dirty || this.freeMode.dirty;
  }

  setClean() {
    this.gridMode.dirty = false;
    this.freeMode.dirty = false;
  }

  get x() {
    return this.currentMode == SpatialMode.GRID_MODE ?
      this.gridMode.x() :
      this.freeMode.x();
  }

  get y() {
    return this.currentMode == SpatialMode.GRID_MODE ?
      this.gridMode.y() :
      this.freeMode.y();
  }

  setInstantaneousPos(x: number, y: number) {
    if (this.currentMode == SpatialMode.GRID_MODE) {
      this.gridMode.setInstantaneousPos(x, y);
    }
    else if (this.currentMode == SpatialMode.FREE_MODE) {
      this.freeMode.setInstantaneousPos(x, y);
    }
  }

  setStaticPos(x: number, y: number) {
    if (this.currentMode == SpatialMode.GRID_MODE) {
      this.gridMode.setStaticPos(x, y);
    }
    else if (this.currentMode == SpatialMode.FREE_MODE) {
      this.freeMode.setStaticPos(x, y);
    }
  }
}

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

class GridModeImpl {
  private _components: Map<number, SpatialComponent>;
  private _grid: Grid;
  private _frameRate: number;

  constructor(components: Map<number, SpatialComponent>,
              w: number,
              h: number,
              frameRate: number) {
    this._components = components;
    this._grid = new Grid(BLOCK_SZ, BLOCK_SZ, w, h);
    this._frameRate = frameRate;
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
}

class FreeModeImpl {
  private _components: Map<number, SpatialComponent>;

  constructor(components: Map<number, SpatialComponent>) {
    this._components = components;
  }

  update() {
    // TODO
  }

  onComponentAdded(c: SpatialComponent) {
    // TODO
  }

  onComponentRemoved(c: SpatialComponent) {
    // TODO
  }

  positionEntity(id: EntityId, x: number, y: number) {
    // TODO
  }
}

export class SpatialSystem {
  protected em: EntityManager;
  protected components: Map<number, SpatialComponent>;
  protected w = 0;
  protected h = 0;
  protected gravityRegion: Span2d;
  protected frameRate: number;
  protected gridModeImpl: GridModeImpl;
  protected freeModeImpl: FreeModeImpl;

  constructor(em: EntityManager,
              w: number,
              h: number,
              gravityRegion: Span2d,
              frameRate: number) {
    this.em = em;
    this.components = new Map<number, SpatialComponent>();

    this.w = w;
    this.h = h;
    this.gravityRegion = gravityRegion;
    this.frameRate = frameRate;

    this.gridModeImpl = new GridModeImpl(this.components, w, h, frameRate);
    this.freeModeImpl = new FreeModeImpl(this.components);
  }

  get grid() {
    return this.gridModeImpl.grid;
  }

  update() {
    this.gridModeImpl.update();
    this.freeModeImpl.update();
  }

  addComponent(component: SpatialComponent) {
    this.components.set(component.entityId, component);
    this.gridModeImpl.onComponentAdded(component);
    this.freeModeImpl.onComponentAdded(component);
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
      this.gridModeImpl.onComponentRemoved(c);
      this.freeModeImpl.onComponentRemoved(c);
    }
    this.components.delete(id);
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

  positionEntity(id: EntityId, x: number, y: number) {
    const c = this.getComponent(id);
    c.setStaticPos(x, y);
  }

  moveEntity(id: EntityId, dx: number, dy: number) {
    const c = this.getComponent(id);
    this.positionEntity(id, c.x + dx, c.y + dy);
  }

  getDirties() {
    const dirties: SpatialComponentPacket[] = [];

    this.components.forEach((c, id) => {
      if (c.isDirty()) {
        dirties.push({
          entityId: c.entityId,
          componentType: ComponentType.SPATIAL,
          x: c.x,
          y: c.y,
          speed: c.gridMode.speed,
          destX: c.gridMode.destX,
          destY: c.gridMode.destY
        });
        c.setClean();
      }
    });

    return dirties;
  }

  gridMode(entityId: EntityId): boolean {
    const c = this.getComponent(entityId);
    return c.currentMode == SpatialMode.GRID_MODE;
  }

  freeMode(entityId: EntityId): boolean {
    const c = this.getComponent(entityId);
    return c.currentMode == SpatialMode.FREE_MODE;
  }

  gm_entityIsMoving(id: EntityId): boolean {
    const c = this.getComponent(id);
    return c.gridMode.moving();
  }
}
