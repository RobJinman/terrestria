import { EntityId, System, Component,
         ComponentPacket, 
         EntityManager} from "./entity_manager";
import { GameError } from "./error";
import { ComponentType } from "./component_types";
import { GameEvent, EEntityMoved, GameEventType } from "./event";
import { SERVER_FRAME_DURATION_MS } from "./config";

type Vec2 = {
  x: number;
  y: number;
};

function sqMagnitude(v: Vec2) {
  return v.x * v.x + v.y * v.y;
}

interface SpatialComponentPacket extends ComponentPacket {
  x: number;
  y: number;
}

export class SpatialComponent extends Component {
  dirty = true;
  private _pos: Vec2 = { x: 0, y: 0 };

  velocity: Vec2 = { x: 0, y: 0 };
  dest: Vec2 = { x: 0, y: 0 };

  constructor(entityId: EntityId) {
    super(entityId, ComponentType.SPATIAL);
  }

  moving() {
    return sqMagnitude(this.velocity) > 0.1;
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
}

export class SpatialSystem extends System {
  private _components: Map<number, SpatialComponent>;
  private _em: EntityManager;
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
                              SERVER_FRAME_DURATION_MS / 1000);
  }

  private _updateEntityPos(c: SpatialComponent) {
    const dx = c.velocity.x / this._frameRate;
    const dy = c.velocity.y / this._frameRate;
    c.x += dx;
    c.y += dy;
/*
    console.log(`c.pos = ${c.x}, ${c.y}`);
    console.log(`dx = ${dx}, dy = ${dy}`);
    console.log(`velocity = ${c.velocity.x}, ${c.velocity.y}`);
    console.log(`dest = ${c.dest.x}, ${c.dest.y}`);
    console.log(`sqDistance = ${sqDistance(c.pos, c.dest)}`);
    console.log(`abs delta = ${dx * dx + dy * dy}`);
*/
    const xDir = dx < 0 ? -1 : 1;
    const yDir = dy < 0 ? -1 : 1;

    if (xDir * (c.x - c.dest.x) > 0 || yDir * (c.y - c.dest.y) > 0) {
      c.x = c.dest.x;
      c.y = c.dest.y;
      c.velocity.x = 0;
      c.velocity.y = 0;
    }

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entityId: c.entityId,
      x: c.x,
      y: c.y
    };

    this._em.postEvent(event);
  }

  positionEntity(id: EntityId, x: number, y: number) {
    this.stopEntity(id);
    const c = this.getComponent(id);

    c.x = x;
    c.y = y;

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

  positionEntity_tween(id: EntityId, x: number, y: number, t: number = 0) {
    const c = this.getComponent(id);
    if (!c.moving()) {
      if (t > 0) {
        c.velocity.x = (x - c.x) / t;
        c.velocity.y = (y - c.y) / t;
        c.dest.x = x;
        c.dest.y = y;

        this._updateEntityPos(c);
      }
      else {
        this.positionEntity(id, x, y);
      }
    }
  }

  moveEntity_tween(id: EntityId, dx: number, dy: number, t: number = 0) {
    const c = this.getComponent(id);
    this.positionEntity_tween(id, c.x + dx, c.y + dy, t);
  }

  stopEntity(id: EntityId) {
    const c = this.getComponent(id);
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
