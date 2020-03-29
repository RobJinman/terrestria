import { EntityId } from "./common/system";

export abstract class SpatialSubcomponent {
  private _id: EntityId;
  private _parent?: SpatialSubcomponent;
  private _children = new Map<EntityId, SpatialSubcomponent>();

  constructor(id: EntityId) {
    this._id = id;
  }

  get entityId() {
    return this._id;
  }

  addChild(child: SpatialSubcomponent) {
    if (child._parent) {
      child._parent.removeChild(child.entityId);
    }
    this._children.set(child.entityId, child);
    child._parent = this;
  }

  removeChild(id: EntityId) {
    const child = this._children.get(id);
    if (child) {
      child._parent = undefined;
      this._children.delete(id);
    }
  }

  get parent() {
    return this._parent;
  }

  x_abs(): number {
    if (this._parent) {
      return this._parent.x_abs() + this.x();
    }
    return this.x();
  }

  y_abs(): number {
    if (this._parent) {
      return this._parent.y_abs() + this.y();
    }
    return this.y();
  }

  abstract x(): number;
  abstract y(): number;
  // Set position without changing destination or speed
  abstract setInstantaneousPos(x: number, y: number): void;
  // Set the position and stop the entity moving
  abstract setStaticPos(x: number, y: number): void;
  abstract isDirty(): boolean;
  abstract setClean(): void;
}
