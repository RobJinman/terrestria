import { EntityManager } from "./entity_manager";
import { GameError } from "./error";
import { GameEvent, EAgentBeginMove, GameEventType } from "./event";
import { SpatialComponent, SpatialSystem } from "./spatial_system";
import { BLOCK_SZ, FRAMES_PER_BLOCK, SERVER_FRAME_RATE } from "./config";
import { ComponentType } from "./component_types";
import { Direction } from "./definitions";
import { ClientSystem } from "./client_system";
import { ServerSystem } from "./server_system";
import { ComponentPacket, Component, EntityId } from "./system";

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

interface PhysicsComponentPacket extends ComponentPacket {
  x: number;
  y: number;
}

export class PhysicsComponent extends Component {
  private _spatial: SpatialComponent;
  private _solid: boolean;
  private _blocking: boolean;
  private _heavy: boolean;
  private _moveable: boolean;
  private _isAgent: boolean;

  constructor(entityId: EntityId,
              spatialComponent: SpatialComponent,
              properties: PhysicalProperties) {
    super(entityId, ComponentType.PHYSICS);

    this._spatial = spatialComponent;
    this._solid = properties.solid;
    this._blocking = properties.blocking;
    this._heavy = properties.heavy;
    this._moveable = properties.moveable;
    this._isAgent = properties.isAgent;
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

  get spatial() {
    return this._spatial;
  }
}

class Grid {
  _blockW: number;
  _blockH: number;
  _w: number;
  _h: number;
  _grid: Set<PhysicsComponent>[][];

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
        this._grid[col][row] = new Set<PhysicsComponent>();
      }
    }
  }

  outOfRange(x: number, y: number): boolean {
    const col = Math.floor(x / this._blockW);
    const row = Math.floor(y / this._blockH);
    return col < 0 || col > this._w - 1 ||
           row < 0 || row > this._h - 1;
  }

  addItem(item: PhysicsComponent) {
    const col = Math.floor(item.spatial.x / this._blockW);
    const row = Math.floor(item.spatial.y / this._blockH);
    this._grid[col][row].add(item);
  }

  onItemMoved(item: PhysicsComponent, oldX: number, oldY: number) {
    const oldCol = Math.floor(oldX / this._blockW);
    const oldRow = Math.floor(oldY / this._blockH);

    const newCol = Math.floor(item.spatial.x / this._blockW);
    const newRow = Math.floor(item.spatial.y / this._blockH);

    if (oldCol == newCol && oldRow == newRow) {
      return;
    }

    if (!this.inCell(oldCol, oldRow).delete(item)) {
      throw new GameError(`No such entity at position ${oldX}, ${oldY}`);
    }
  
    this._grid[newCol][newRow].add(item);
  }

  removeItem(item: PhysicsComponent): boolean {
    for (const col of this._grid) {
      for (const cell of col) {
        return cell.delete(item);
      }
    }
    return false;
  }

  inCell(col: number, row: number): Set<PhysicsComponent> {
    return this._grid[col][row];
  }

  atPos(x: number, y: number): Set<PhysicsComponent> {
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

  blockingItemAtPos(x: number, y: number): boolean {
    const items = this.atPos(x, y);

    for (const c of items) {
      if (c.blocking) {
        return true;
      }
    }
    return false;
  }
}

function directionToVector(dir: Direction) {
  switch (dir) {
    case Direction.UP: return [0, BLOCK_SZ];
    case Direction.RIGHT: return [BLOCK_SZ, 0];
    case Direction.DOWN: return [0, -BLOCK_SZ];
    case Direction.LEFT: return [-BLOCK_SZ, 0];
    default: return [0, 0];
  }
}

export class PhysicsSystem implements ClientSystem, ServerSystem {
  private _em: EntityManager;
  private _components: Map<EntityId, PhysicsComponent>;
  private _grid: Grid;

  constructor(em: EntityManager, w: number, h: number) {
    this._em = em;
    this._components = new Map<EntityId, PhysicsComponent>();
    this._grid = new Grid(BLOCK_SZ, BLOCK_SZ, w, h);
  }

  updateComponent(packet: PhysicsComponentPacket) {
    const c = this.getComponent(packet.entityId);
    this.setEntityPosition(c.entityId, packet.x, packet.y);
  }

  setEntityPosition(id: EntityId, x: number, y: number) {
    const spatialSys = <SpatialSystem>this._em.getSystem(ComponentType.SPATIAL);
    spatialSys.positionEntity(id, x, y);

    const c = this.getComponent(id);
    this._grid.addItem(c);
  }

  moveEntity(id: EntityId, direction: Direction, speedMultiplier: number = 1) {
    const c = this.getComponent(id);
    if (!c.isAgent) {
      throw new GameError("Only agents can be moved");
    }

    const delta = directionToVector(direction);

    const destX = c.spatial.x + delta[0];
    const destY = c.spatial.y + delta[1];

    if (this._grid.outOfRange(destX, destY)) {
      return;
    }

    if (!this._grid.blockingItemAtPos(destX, destY)) {
      const spatialSys = <SpatialSystem>this._em
                                            .getSystem(ComponentType.SPATIAL);
      const t = FRAMES_PER_BLOCK / (SERVER_FRAME_RATE * speedMultiplier);
      spatialSys.moveEntity_tween(id, delta[0], delta[1], t);

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

  addComponent(component: PhysicsComponent) {
    this._components.set(component.entityId, component);
    this._grid.addItem(component);
  }

  hasComponent(id: EntityId) {
    return this._components.has(id);
  }

  getComponent(id: EntityId) {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No physics component for entity ${id}`);
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
    // TODO: gravity
  }

  getState() {
    const packets: PhysicsComponentPacket[] = [];

    this._components.forEach((c, id) => {
      packets.push({
        componentType: ComponentType.PHYSICS,
        entityId: c.entityId,
        x: c.spatial.x,
        y: c.spatial.y
      });
    });

    return packets;
  }

  getDirties() {
    const dirties: PhysicsComponentPacket[] = [];

    this._components.forEach((c, id) => {
      if (c.spatial.dirty) {
        dirties.push({
          entityId: c.entityId,
          componentType: ComponentType.PHYSICS,
          x: c.spatial.x,
          y: c.spatial.y
        });
      }
    });

    return dirties;
  }
}
