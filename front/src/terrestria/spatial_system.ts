import { EntityId } from "./common/system";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { CSpatial } from "./spatial_component";
import { ClientSystem } from "./common/client_system";
import { Vec2, normalise } from "./common/geometry";
import { SpatialComponentPacket,
         SpatialMode } from "./common/spatial_component_packet";
import { SYNC_INTERVAL_MS } from "./common/constants";

export class SpatialSystem implements ClientSystem {
  private _components: Map<number, CSpatial>;
  private _frameRate: number;

  constructor(frameRate: number) {
    this._components = new Map<number, CSpatial>();
    this._frameRate = frameRate;
  }

  updateComponent(packet: SpatialComponentPacket) {
    const c = this.getComponent(packet.entityId);
    if (packet.mode == SpatialMode.GRID_MODE) {
      if (packet.speed > 0) {
        c.setDestination(packet.x, packet.y, packet.speed);
      }
      else {
        c.setStaticPos(packet.x, packet.y);
      }
    }
    else if (packet.mode == SpatialMode.FREE_MODE) {
      const dx = packet.x - c.x;
      const dy = packet.y - c.y;
      const s = Math.sqrt(dx * dx + dy * dy);
      const t = SYNC_INTERVAL_MS / 1000;
      c.setDestination(packet.x, packet.y, s / t);
      c.setAngle(packet.angle);
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

  private _updateEntityPos(c: CSpatial) {
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
