import { Direction } from "./definitions";
import { BLOCK_SZ } from "./constants";

export type Vec2 = {
  x: number;
  y: number;
};

export function directionToVector(dir: Direction) {
  switch (dir) {
    case Direction.UP: return { x: 0, y: -BLOCK_SZ };
    case Direction.RIGHT: return { x: BLOCK_SZ, y: 0 };
    case Direction.DOWN: return { x: 0, y: BLOCK_SZ };
    case Direction.LEFT: return { x: -BLOCK_SZ, y: 0 };
    default: return { x: 0, y: 0 };
  }
}

export function normalise(v: Vec2) {
  const s = Math.sqrt(v.x * v.x + v.y * v.y);
  if (s !== 0) {
    v.x /= s;
    v.y /= s;
  }
  else {
    v.x = 0.70710678118;
    v.y = 0.70710678118;
  }
}

export enum ShapeType {
  CIRCLE,
  RECTANGLE,
  ROUNDED_RECTANGLE,
  POLYGON
}

export abstract class Shape {
  private _type: ShapeType;

  constructor(type: ShapeType) {
    this._type = type;
  }

  get type() {
    return this._type;
  }
}

export class Rectangle extends Shape {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    super(ShapeType.RECTANGLE);

    this.width = width;
    this.height = height;
  }
}

export class RoundedRectangle extends Shape {
  width: number;
  height: number;
  radius: number;

  constructor(width: number, height: number, radius: number) {
    super(ShapeType.ROUNDED_RECTANGLE);

    this.width = width;
    this.height = height;
    this.radius = radius;
  }
}

export class Circle extends Shape {
  radius: number;

  constructor(radius: number) {
    super(ShapeType.CIRCLE);

    this.radius = radius;
  }
}

export class Polygon extends Shape {
  points: Vec2[];

  constructor(points: Vec2[]) {
    super(ShapeType.POLYGON);

    this.points = points;
  }
}
