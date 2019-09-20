import { EntityId, System, Component } from "./entity_manager";
import { GameError } from "./error";

export class SpatialComponent extends Component {
  dirty = true;
  private _x = 0;
  private _y = 0;

  set x(value: number) {
    this._x = value;
    this.dirty = true;
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

  positionEntity(id: EntityId, x: number, y: number) {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No spatial component for entity ${id}`);
    }

    c.x = x;
    c.y = y;
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

  update() {
    // TODO
  }

  getDirties() {
    const dirties: Component[] = [];

    this._components.forEach((c, id) => {
      if (!c) {
        throw new GameError(`No spatial component for entity ${id}`);
      }

      if (c.dirty) {
        dirties.push(c);
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
