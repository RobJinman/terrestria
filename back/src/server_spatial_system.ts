import { SpatialComponent, SpatialComponentPacket,
         directionToVector, 
         Grid} from "./common/spatial_system";
import { EntityManager } from "./common/entity_manager";
import { BLOCK_SZ } from "./common/config";
import { EntityId } from "./common/system";
import { EEntityMoved, GameEventType, GameEvent,
         EAgentBeginMove } from "./common/event";
import { ComponentType } from "./common/component_types";
import { GameError } from "./common/error";
import { Direction } from "./common/definitions";
import { ServerSystem } from "./common/server_system";

export class ServerSpatialSystem implements ServerSystem {
  private _components: Map<number, SpatialComponent>;
  private _em: EntityManager;
  private _w = 0;
  private _h = 0;
  private _grid: Grid;

  constructor(entityManager: EntityManager,
              w: number,
              h: number) {
    this._em = entityManager;
    this._components = new Map<number, SpatialComponent>();

    this._w = w;
    this._h = h;

    this._grid = new Grid(BLOCK_SZ, BLOCK_SZ, w, h);
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