import { EntityId, System, Component, ComponentPacket,
         EntityManager} from "./entity_manager";
import { GameError } from "./error";
import { ComponentType } from "./component_types";
import { GameEvent, EEntityMoved, GameEventType } from "./event";
import { SERVER_FRAME_RATE, BLOCK_SZ } from "./config";

type Vec2 = {
  x: number;
  y: number;
};

interface SpatialComponentPacket extends ComponentPacket {
  x: number;
  y: number;
}

export class SpatialComponent extends Component {
  dirty = true;
  private _pos: Vec2 = { x: 0, y: 0 };
  private _solid: boolean;

  velocity: Vec2 = { x: 0, y: 0 };
  dest: Vec2 = { x: 0, y: 0 };

  constructor(entityId: EntityId, solid: boolean) {
    super(entityId, ComponentType.SPATIAL);
    this._solid = solid;
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
}

class Grid {
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

  addItem(item: SpatialComponent) {
    const col = Math.floor(item.x / this._blockW);
    const row = Math.floor(item.y / this._blockH);
    this._grid[col][row].add(item);
  }

  onItemMoved(item: SpatialComponent, oldX: number, oldY: number) {
    const oldCol = Math.floor(oldX / this._blockW);
    const oldRow = Math.floor(oldY / this._blockH);

    const newCol = Math.floor(item.x / this._blockW);
    const newRow = Math.floor(item.y / this._blockH);

    if (oldCol == newCol && oldRow == newRow) {
      return;
    }

    if (!this.inCell(oldCol, oldRow).delete(item)) {
      throw new GameError(`No such entity at position ${oldX}, ${oldY}`);
    }
  
    this._grid[newCol][newRow].add(item);
  }

  removeItem(item: SpatialComponent): boolean {
    for (const col of this._grid) {
      for (const cell of col) {
        return cell.delete(item);
      }
    }
    return false;
  }

  inCell(col: number, row: number): Set<SpatialComponent> {
    return this._grid[col][row];
  }

  atPos(x: number, y: number): Set<SpatialComponent> {
    const col = Math.floor(x / this._blockW);
    const row = Math.floor(y / this._blockH);
    return this.inCell(col, row);
  }

  dbg_print() {
    for (let i = 0; i < this._w; ++i) {
      let msg = "";
      for (let j = 0; j < this._h; ++j) {
        msg += this._grid[i][j].size + " ";
      }
      console.log(msg);
    }
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

export class SpatialSystem extends System {
  private _components: Map<number, SpatialComponent>;
  private _em: EntityManager;
  private _grid: Grid;
  private _w = 0;
  private _h = 0;
  private _frameRate: number;

  constructor(entityManager: EntityManager,
              w: number,
              h: number,
              frameRate: number) {
    super();

    this._em = entityManager;
    this._components = new Map<number, SpatialComponent>();
    this._grid = new Grid(BLOCK_SZ, BLOCK_SZ, w, h);

    this._w = w;
    this._h = h;

    this._frameRate = frameRate;
  }

  updateComponent(packet: SpatialComponentPacket) {
    const c = this.getComponent(packet.entityId);
    this.stopEntity(c.entityId);
    this.positionEntity_tween(c.entityId,
                              packet.x,
                              packet.y,
                              1.0 / SERVER_FRAME_RATE);
  }

  private _setEntityPos(c: SpatialComponent, x: number, y: number) {
    const oldX = c.x;
    const oldY = c.y;
    c.x = x;
    c.y = y;
    this._grid.onItemMoved(c, oldX, oldY);
  }

  private _updateEntityPos(c: SpatialComponent) {
    const dx = c.velocity.x / this._frameRate;
    const dy = c.velocity.y / this._frameRate;
    this._setEntityPos(c, c.x + dx, c.y + dy);

    const xDir = dx < 0 ? -1 : 1;
    const yDir = dy < 0 ? -1 : 1;
    const reachedDestX = xDir * (c.x - c.dest.x) > -0.5;
    const reachedDestY = yDir * (c.y - c.dest.y) > -0.5;

    if (reachedDestX && reachedDestY) {
      c.velocity.x = 0;
      c.velocity.y = 0;
      this._setEntityPos(c, c.dest.x, c.dest.y);
    }

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entityId: c.entityId,
      x: c.x,
      y: c.y
    };

    this._em.postEvent(event);
  }

  entityIsMoving(id: EntityId) {
    const c = this.getComponent(id);
    return c.moving();
  }

  positionEntity(id: EntityId, x: number, y: number) {
    this.stopEntity(id);
    const c = this.getComponent(id);

    this._setEntityPos(c, x, y);

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entityId: c.entityId,
      x: c.x,
      y: c.y
    };

    this._em.postEvent(event);
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

    const destCol = Math.floor((c.x + dx) / BLOCK_SZ);
    const destRow = Math.floor((c.y + dy) / BLOCK_SZ);

    const outOfRange = destCol < 0 || destCol > this._w - 1 ||
                       destRow < 0 || destRow > this.h - 1;

    if (!outOfRange && !this._grid.solidItemAtPos(c.x + dx, c.y + dy)) {
      return this.positionEntity_tween(id, c.x + dx, c.y + dy, t);
    }

    return false;
  }

  stopEntity(id: EntityId) {
    const c = this.getComponent(id);
    c.velocity.x = 0;
    c.velocity.y = 0;
  }

  finishTween(id: EntityId) {
    const c = this.getComponent(id);
    this._setEntityPos(c, c.dest.x, c.dest.y);
    c.velocity.x = 0;
    c.velocity.y = 0;
  }

  numComponents() {
    return this._components.size;
  }

  addComponent(component: SpatialComponent) {
    this._components.set(component.entityId, component);
    this._grid.addItem(component);
  }

  hasComponent(id: EntityId) {
    return this._components.has(id);
  }

  getComponent(id: EntityId) {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No spatial component for entity ${id}`);
    }
    return c;
  }

  removeComponent(id: EntityId) {
    const c = this.getComponent(id);
    this._grid.removeItem(c);
    this._components.delete(id);
  }

  handleEvent(event: GameEvent) {
    // TODO
  }

  update() {
    this._components.forEach(c => {
      if (c.moving()) {
        this._updateEntityPos(c);
      }
    });
  }

  getState() {
    const packets: SpatialComponentPacket[] = [];

    this._components.forEach((c, id) => {
      packets.push({
        componentType: ComponentType.SPATIAL,
        entityId: c.entityId,
        x: c.x,
        y: c.y
      });
    });

    return packets;
  }

  getDirties() {
    const dirties: SpatialComponentPacket[] = [];

    this._components.forEach((c, id) => {
      if (c.dirty) {
        dirties.push({
          entityId: c.entityId,
          componentType: ComponentType.SPATIAL,
          x: c.x,
          y: c.y
        });
        c.dirty = false;
      }
    });

    return dirties;
  }

  get w() {
    return this._w;
  }

  get h() {
    return this._h;
  }
}
