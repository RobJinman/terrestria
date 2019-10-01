import { ClientSystem } from "./common/client_system";
import { SpatialComponent,
         SpatialComponentPacket } from "./common/spatial_system";
import { EntityManager } from "./common/entity_manager";
import { SERVER_FRAME_RATE } from "./common/config";
import { EEntityMoved, GameEventType, GameEvent } from "./common/event";
import { EntityId } from "./common/system";
import { GameError } from "./common/error";

export class ClientSpatialSystem implements ClientSystem {
  private _components: Map<number, SpatialComponent>;
  private _em: EntityManager;
  private _w = 0;
  private _h = 0;
  private _frameRate: number;

  constructor(entityManager: EntityManager,
              w: number,
              h: number,
              frameRate: number) {

    this._em = entityManager;
    this._components = new Map<number, SpatialComponent>();

    this._w = w;
    this._h = h;

    this._frameRate = frameRate;
  }

  updateComponent(packet: SpatialComponentPacket) {
    const c = this.getComponent(packet.entityId);
    this.stopEntity(c.entityId);
    //this.positionEntity(c.entityId,
    //                    packet.x,
    //                    packet.y);
    this.positionEntity_tween(c.entityId,
                              packet.x,
                              packet.y,
                              1.0 / SERVER_FRAME_RATE);
  }

  private _setEntityPos(c: SpatialComponent, x: number, y: number) {
    c.x = x;
    c.y = y;
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
      entities: new Set([c.entityId]),
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

    console.log(`Moving entity ${id}`);
    return this.positionEntity_tween(id, c.x + dx, c.y + dy, t);
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

  handleEvent(event: GameEvent) {}

  update() {
    this._components.forEach(c => {
      if (c.moving()) {
        this._updateEntityPos(c);
      }
    });
  }

  get w() {
    return this._w;
  }

  get h() {
    return this._h;
  }
}
