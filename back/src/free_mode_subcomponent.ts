import { SpatialSubcomponent } from "./spatial_subcomponent";
import { FreeModeProperties } from "./free_mode_properties";
import { Bodies, Body, Vector } from "matter-js";
import { BLOCK_SZ } from "./common/constants";
import { EntityId } from "./common/system";

function notEqual(a: number, b: number) {
  return Math.abs(a - b) >= 0.1;
}

export class FreeModeSubcomponent implements SpatialSubcomponent {
  private _entityId: EntityId;
  private _properties: FreeModeProperties;
  private _body: Body;
  private _offset: Vector;

  private _prev: {
    x: number,
    y: number
  };

  constructor(entityId: EntityId, properties: FreeModeProperties) {
    this._entityId = entityId;
    this._properties = properties;
    this._body = Bodies.rectangle(0, 0, BLOCK_SZ, BLOCK_SZ);

    // TODO: Prevents rotation. Remove this
    Body.setInertia(this._body, Infinity);

    this._offset = Vector.sub(this._body.position, this._body.bounds.min);

    this._prev = {
      x: 0,
      y: 0
    };
  }

  get entityId() {
    return this._entityId;
  }

  get body() {
    return this._body;
  }

  isDirty() {
    return notEqual(this._body.position.x, this._prev.x) ||
           notEqual(this._body.position.y, this._prev.y);
  }

  setClean() {
    this._prev.x = this._body.position.x;
    this._prev.y = this._body.position.y;
  }

  setInstantaneousPos(x: number, y: number) {
    Body.setPosition(this._body, {
      x: x + this._offset.x,
      y: y + this._offset.y
    });
  }

  setStaticPos(x: number, y: number) {
    this.setInstantaneousPos(x, y);
  }

  x() {
    return this._body.position.x - this._offset.x;
  }

  y() {
    return this._body.position.y - this._offset.y;
  }

  get angle() {
    return this._body.angle;
  }
}
