import { SpatialSubcomponent } from "./spatial_subcomponent";
import { FreeModeProperties } from "./free_mode_properties";
import { Bodies, Body, Vector } from "matter-js";
import { EntityId } from "./common/system";
import { Shape, ShapeType, Circle, Rectangle,
         Polygon } from "./common/geometry";
import { BLOCK_SZ } from "./common/constants";
import { GameError } from "./common/error";

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

  constructor(entityId: EntityId,
              properties: FreeModeProperties,
              shape?: Shape) {
    this._entityId = entityId;
    this._properties = properties;

    if (!shape) {
      shape = new Circle(BLOCK_SZ * 0.5);
    }

    // Workaround for https://github.com/liabru/matter-js/issues/800
    if (properties.fixedAngle && shape.type != ShapeType.CIRCLE) {
      throw new GameError("Fixed angle only permitted on circles");
    }

    this._body = this._createBodyFromShape(shape);
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

  get fixedAngle() {
    return this._properties.fixedAngle;
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
    Body.setVelocity(this._body, Vector.create(0, 0));
    Body.setAngularVelocity(this._body, 0);
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

  private _createBodyFromShape(shape: Shape): Body {
    let body: Body|undefined = undefined;

    switch (shape.type) {
      case ShapeType.CIRCLE: {
        const circle = <Circle>shape;
        body = Bodies.circle(0, 0, circle.radius, {
          isStatic: !this._properties.heavy
        });
        break;
      }
      case ShapeType.RECTANGLE: {
        const rect = <Rectangle>shape;
        body = Bodies.rectangle(0, 0, rect.width, rect.height, {
          isStatic: !this._properties.heavy
        });
        break;
      }
      case ShapeType.POLYGON: {
        const poly = <Polygon>shape;
        const verts: Vector[] = [];

        for (const pt of poly.points) {
          verts.push(Vector.create(pt.x, pt.y));
        }

        body = Bodies.fromVertices(0, 0, [ verts ], {
          isStatic: !this._properties.heavy
        });
        break;
      }
    }

    if (!body) {
      throw new GameError("Error creating body from shape; No such shape type");
    }

    const centreOfMass = Vector.sub(body.position, body.bounds.min);
    const centre = Vector.create(BLOCK_SZ * 0.5, BLOCK_SZ * 0.5);
    const delta = Vector.sub(centre, centreOfMass);

    body.position.x += delta.x;
    body.position.y += delta.y;

    // This is the recommended method, but has problems.
    // See https://github.com/liabru/matter-js/issues/800
    /*
    if (this._properties.fixedAngle) {
      Body.setInertia(body, Infinity);
    }
    */

    return body;
  }
}
