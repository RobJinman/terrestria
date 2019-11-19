import { ComponentPacket, EntityId } from "./common/system";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { EntityManager } from "./common/entity_manager";
import { ClientSpatialComponent } from "./client_spatial_component";
import { ClientSystem } from "./common/client_system";
import { Vec2, normalise } from "./common/geometry";

export interface SpatialComponentPacket extends ComponentPacket {
  x: number;
  y: number;
  destX: number;
  destY: number;
  speed: number;
}

export class ClientSpatialSystem implements ClientSystem {
  private _em: EntityManager;
  private _components: Map<number, ClientSpatialComponent>;
  private _frameRate: number;

  constructor(em: EntityManager,
              frameRate: number) {
    this._em = em;
    this._components = new Map<number, ClientSpatialComponent>();
    this._frameRate = frameRate;
  }

  updateComponent(packet: SpatialComponentPacket) {
    const c = this.getComponent(packet.entityId);
    if (packet.speed > 0.1) {
      c.setDestination(packet.destX, packet.destY, packet.speed);
    }
    else {
      c.setStaticPos(packet.x, packet.y);
    }
  }

  update() {
    this._components.forEach(c => {
      if (c.moving()) {
        this._updateEntityPos(c);
      }
    });
  }

  addComponent(component: ClientSpatialComponent) {
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

  private _updateEntityPos(c: ClientSpatialComponent) {
    const v: Vec2 = {
      x: c.destX - c.x,
      y: c.destY - c.y
    };
    normalise(v);

    const dx = v.x * c.speed / this._frameRate;
    const dy = v.y * c.speed / this._frameRate;

    c.setInstantaneousPos(c.x + dx, c.y + dy);

    const xDir = dx < 0 ? -1 : 1;
    const yDir = dy < 0 ? -1 : 1;
    const reachedDestX = xDir * (c.x - c.destX) > -0.5;
    const reachedDestY = yDir * (c.y - c.destY) > -0.5;

    if (reachedDestX && reachedDestY) {
      c.setStaticPos(c.destX, c.destY);
    }
  }
}
