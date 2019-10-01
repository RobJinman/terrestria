import { SpatialComponent, SpatialComponentPacket,
         directionToVector } from "./common/spatial_system";
import { EntityManager } from "./common/entity_manager";
import { BLOCK_SZ } from "./common/config";
import { EntityId } from "./common/system";
import { EEntityMoved, GameEventType, GameEvent,
         EAgentBeginMove } from "./common/event";
import { ComponentType } from "./common/component_types";
import { GameError } from "./common/error";
import { Direction } from "./common/definitions";
import { ServerSystem } from "./common/server_system";

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

export class ServerSpatialSystem implements ServerSystem {
  private _components: Map<number, SpatialComponent>;
  private _em: EntityManager;
  private _w = 0;
  private _h = 0;
  private _grid: Grid;
  private _frameRate: number;

  constructor(entityManager: EntityManager,
              w: number,
              h: number,
              frameRate: number) {

    this._em = entityManager;
    this._components = new Map<number, SpatialComponent>();

    this._w = w;
    this._h = h;

    this._grid = new Grid(BLOCK_SZ, BLOCK_SZ, w, h);

    this._frameRate = frameRate;
  }

  private _setEntityPos(c: SpatialComponent, x: number, y: number) {
    const oldX = c.x;
    const oldY = c.y;

    c.x = x;
    c.y = y;

    this._grid.onItemMoved(c, oldX, oldY);
  }

  entityIsMoving(id: EntityId) {
    const c = this.getComponent(id);
    return c.moving();
  }

  positionEntity(id: EntityId, x: number, y: number) {
    const c = this.getComponent(id);

    this._setEntityPos(c, x, y);

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entities: new Set([c.entityId]),
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

  moveAgent(id: EntityId, direction: Direction) {
    const c = this.getComponent(id);
    if (!c.isAgent) {
      throw new GameError("Entity is not agent");
    }

    const delta = directionToVector(direction);

    const destX = c.x + delta[0];
    const destY = c.y + delta[1];

    if (this._grid.outOfRange(destX, destY)) {
      return;
    }

    if (!this._grid.blockingItemAtPos(destX, destY)) {
      this.moveEntity(id, delta[0], delta[1]);

      const items = [...this._grid.atPos(destX, destY)].map(c => c.entityId);

      const event: EAgentBeginMove = {
        type: GameEventType.AGENT_BEGIN_MOVE,
        entities: new Set(items),
        entityId: id,
        direction: direction,
        gridX: Math.round(destX / BLOCK_SZ),
        gridY: Math.round(destY / BLOCK_SZ)
      };

      this._em.postEvent(event);
    }
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
    const c = this._components.get(id);
    if (c) {
      this._grid.removeItem(c);
    }
    this._components.delete(id);
  }

  handleEvent(event: GameEvent) {}

  update() {
    this._components.forEach(c => {
      if (c.heavy) {
        const gridY = this._grid.toGridX(c.y);

        if (gridY > 0 && !this._grid.solidItemAtPos(c.x, c.y - BLOCK_SZ)) {
          console.log(`Falling entity ${c.entityId}`);
          this.moveEntity(c.entityId, 0, -BLOCK_SZ);
          c.falling = true;
        }
        else {
          c.falling = false;
        }
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