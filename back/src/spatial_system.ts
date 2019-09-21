import { EntityId, System, Component, ComponentPacket } from "./entity_manager";
import { GameError } from "./error";
import { ComponentType } from "./component_types";
import { GameEvent } from "./event";

interface SpatialComponentPacket extends ComponentPacket {
  x: number;
  y: number;
}

export class SpatialComponent extends Component {
  dirty = true;
  private _x = 0;
  private _y = 0;

  get x() {
    return this._x;
  }

  set x(value: number) {
    this._x = value;
    this.dirty = true;
  }

  get y() {
    return this._y;
  }

  set y(value: number) {
    this._y = value;
    this.dirty = true;
  }
}

export class SpatialSystem extends System {
  private _components: Map<number, SpatialComponent>;
  //private _grid: Set<EntityId>[][] = [];
  private _w = 0;
  private _h = 0;

  constructor(w: number, h: number) {
    super();

    this._components = new Map<number, SpatialComponent>();

    this._w = w;
    this._h = h;

    //this._createGrid(w, h);
  }

  updateComponent(packet: ComponentPacket) {
    // TODO
  }

  positionEntity(id: EntityId, x: number, y: number) {
    console.log(`Moving entity ${id} to (${x}, ${y})`);

    const c = this.getComponent(id);
    c.x = x;
    c.y = y;
  }

  moveEntity(id: EntityId, dx: number, dy: number) {
    console.log(`Moving entity ${id} by (${dx}, ${dy})`);

    const c = this.getComponent(id);
    c.x += dx;
    c.y += dy;
  }

  numComponents() {
    return this._components.size;
  }

  addComponent(component: SpatialComponent) {
    this._components.set(component.entityId, component);
  }

  hasComponent(id: EntityId) {
    return id in this._components;
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
    // TODO
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
/*
  private _createGrid(w: number, h: number) {
    this._grid = new Array(w);
    for (let c = 0; c < w; ++c) {
      this._grid[c] = [];
      for (let r = 0; r < h; ++r) {
        this._grid[c][r] = new Set<EntityId>();
      }
    }
  }*/
}
