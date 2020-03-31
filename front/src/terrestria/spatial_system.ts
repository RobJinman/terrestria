import { EntityId } from "./common/system";
import { GameError } from "./common/error";
import { GameEvent, GameEventType, EEntityMoved } from "./common/event";
import { CSpatial } from "./spatial_component";
import { ClientSystem } from "./common/client_system";
import { Vec2, normalise } from "./common/geometry";
import { SpatialPacket, SpatialMode } from "./common/spatial_packet";
import { SYNC_INTERVAL_MS } from "./common/constants";
import { EntityManager } from "./entity_manager";

export class SpatialSystem implements ClientSystem {
  private _em: EntityManager;
  private _components: Map<number, CSpatial>;
  private _frameRate: number;

  constructor(em: EntityManager, frameRate: number) {
    this._em = em;
    this._components = new Map<number, CSpatial>();
    this._frameRate = frameRate;
  }

  addChildToEntity(id: EntityId, childId: EntityId) {
    const parent = this._components.get(id);
    const child = this._components.get(childId);

    if (parent && child) {
      parent._addChild(child);

      const moveEvent: EEntityMoved = {
        type: GameEventType.ENTITY_MOVED,
        x: child.x_abs,
        y: child.y_abs,
        entityId: child.entityId,
        entities: [ child.entityId ]
      };
      this._em.postEvent(moveEvent);
    }
  }

  removeChildFromEntity(id: EntityId, childId: EntityId) {
    const parent = this._components.get(id);
    const child = this._components.get(childId);

    if (parent && child) {
      parent._removeChild(childId);

      const moveEvent: EEntityMoved = {
        type: GameEventType.ENTITY_MOVED,
        x: child.x_abs,
        y: child.y_abs,
        entityId: child.entityId,
        entities: [ child.entityId ]
      };
      this._em.postEvent(moveEvent);
    }
  }

  updateComponent(packet: SpatialPacket) {
    const c = this.getComponent(packet.entityId);

    if (packet.mode == SpatialMode.GRID_MODE) {
      if (packet.speed > 0) {
        this._setDestination(c, packet.x, packet.y, packet.speed);
      }
      else {
        this._setStaticPos(c, packet.x, packet.y);
      }
    }
    else if (packet.mode == SpatialMode.FREE_MODE) {
      const dx = packet.x - c.x;
      const dy = packet.y - c.y;
      const s = Math.sqrt(dx * dx + dy * dy);
      const t = SYNC_INTERVAL_MS / 1000;
      this._setDestination(c, packet.x, packet.y, s / t);
      this._setAngle(c, packet.angle);
    }
  }

  update() {
    this._components.forEach(c => {
      if (c.moving()) {
        this._updateEntityPos(c);
      }
    });
  }

  addComponent(component: CSpatial) {
    this._components.set(component.entityId, component);
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
    this._components.delete(id);
  }

  numComponents() {
    return this._components.size;
  }

  handleEvent(event: GameEvent) {}

  setInstantaneousPos(entityId: EntityId, x: number, y: number) {
    const c = this.getComponent(entityId);
    this._setInstantaneousPos(c, x, y);
  }

  setStaticPos(entityId: EntityId, x: number, y: number) {
    const c = this.getComponent(entityId);
    this._setStaticPos(c, x, y);
  }

  setDestination(entityId: EntityId, x: number, y: number, speed: number) {
    const c = this.getComponent(entityId);
    this._setDestination(c, x, y, speed);
  }

  setAngle(entityId: EntityId, angle: number) {
    const c = this.getComponent(entityId);
    this._setAngle(c, angle);

    // TODO: Post event
  }

  private _updateEntityPos(c: CSpatial) {
    const v: Vec2 = {
      x: c.destX - c.x,
      y: c.destY - c.y
    };
    normalise(v);

    const dx = v.x * c.speed / this._frameRate;
    const dy = v.y * c.speed / this._frameRate;

    this._setInstantaneousPos(c, c.x + dx, c.y + dy);

    const xDir = dx < 0 ? -1 : 1;
    const yDir = dy < 0 ? -1 : 1;
    const reachedDestX = xDir * (c.x - c.destX) > -0.5;
    const reachedDestY = yDir * (c.y - c.destY) > -0.5;

    if (reachedDestX && reachedDestY) {
      this._setStaticPos(c, c.destX, c.destY);
    }
  }

  private _setInstantaneousPos(c: CSpatial, x: number, y: number) {
    c._setInstantaneousPos(x, y);

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entities: [c.entityId],
      entityId: c.entityId,
      x: c.x,
      y: c.y
    };

    this._em.postEvent(event);
  }

  private _setStaticPos(c: CSpatial, x: number, y: number) {
    c._setStaticPos(x, y);

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entities: [c.entityId],
      entityId: c.entityId,
      x: c.x,
      y: c.y
    };

    this._em.postEvent(event);
  }

  private _setDestination(c: CSpatial, x: number, y: number, speed: number) {
    c._setDestination(x, y, speed);
  }

  private _setAngle(c: CSpatial, angle: number) {
    c._setAngle(angle);

    // TODO: Post event
  }
}
