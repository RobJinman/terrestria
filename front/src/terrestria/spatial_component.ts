import { Component, EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { EntityManager } from "./entity_manager";

export class CSpatial extends Component {
  private _posX = 0;
  private _posY = 0;
  private _destX = 0;
  private _destY = 0;
  private _angle = 0;
  private _parent?: CSpatial;
  private _children = new Map<EntityId, CSpatial>();

  speed = 0;

  constructor(entityId: EntityId, em: EntityManager) {
    super(entityId, ComponentType.SPATIAL);
  }

  _addChild(child: CSpatial) {
    if (child._parent) {
      child._parent._removeChild(child.entityId);
    }
    this._children.set(child.entityId, child);
    child._parent = this;
  }

  _removeChild(id: EntityId) {
    const child = this._children.get(id);
    if (child) {
      child._parent = undefined;
      this._children.delete(id);
    }
  }

  get parent() {
    return this._parent;
  }

  _setInstantaneousPos(x: number, y: number) {
    this._posX = x;
    this._posY = y;
  }

  setStaticPos(x: number, y: number) {
    this.speed = 0;
    this._destX = x;
    this._destY = y;
    this._setInstantaneousPos(x, y);
  }

  _setDestination(x: number, y: number, speed: number) {
    this._destX = x;
    this._destY = y;
    this.speed = speed;
  }

  _setAngle(angle: number) {
    this._angle = angle;
  }

  moving() {
    return this.speed > 0.1;
  }

  get x() {
    return this._posX;
  }

  get y() {
    return this._posY;
  }

  get destX() {
    return this._destX;
  }

  get destY() {
    return this._destY;
  }

  get angle() {
    return this._angle;
  }

  get x_abs(): number {
    if (this._parent) {
      return this._parent.x_abs + this.x;
    }
    return this.x;
  }

  get y_abs(): number {
    if (this._parent) {
      return this._parent.y_abs + this.y;
    }
    return this.y;
  }

  get destX_abs(): number {
    if (this._parent) {
      return this._parent.destX_abs + this.destX;
    }
    return this.destX;
  }

  get destY_abs(): number {
    if (this._parent) {
      return this._parent.destY_abs + this.destY;
    }
    return this.destY;
  }

  get angle_abs(): number {
    if (this._parent) {
      return this._parent.angle_abs + this.angle;
    }
    return this.angle;
  }
}
