import { SpatialSubcomponent } from "./spatial_subcomponent";
import { FreeModeProperties } from "./free_mode_properties";
import { Bodies, Body } from "matter-js";
import { BLOCK_SZ } from "./common/constants";
import { EntityId } from "./common/system";

function notEqual(a: number, b: number) {
  return Math.abs(a - b) >= 0.1;
}

function bodyHeight(body: Body) {
  return body.bounds.max.y - body.bounds.min.y
}

export class FreeModeSubcomponent implements SpatialSubcomponent {
  private _entityId: EntityId;
  private _properties: FreeModeProperties;
  private _body: Matter.Body;
  private _toMatterJsY = (y: number, h: number) => y;
  private _fromMatterJsY = (y: number, h: number) => y;

  private _prev: {
    x: number,
    y: number
  };

  constructor(entityId: EntityId, properties: FreeModeProperties) {
    this._entityId = entityId;
    this._properties = properties;
    this._body = Bodies.rectangle(0, 0, BLOCK_SZ, BLOCK_SZ, {
      frictionAir: 0.01,
      friction: 0.1,
      restitution: 0.6
    });
    this._prev = {
      x: 0,
      y: 0
    };
  }

  init(toMatterJsY: (y: number, h: number) => number,
       fromMatterJsY: (y: number, h: number) => number) {

    this._toMatterJsY = toMatterJsY;
    this._fromMatterJsY = fromMatterJsY;
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
    const h = bodyHeight(this._body);
    Body.setPosition(this._body, { x, y: this._toMatterJsY(y, h) });
  }

  setStaticPos(x: number, y: number) {
    const h = bodyHeight(this._body);
    Body.setPosition(this._body, { x, y: this._toMatterJsY(y, h) });
  }

  x() {
    return this._body.position.x;
  }

  y() {
    const h = bodyHeight(this._body);
    return this._fromMatterJsY(this._body.position.y, h);
  }

  get h() {
    return bodyHeight(this._body);
  }
}
