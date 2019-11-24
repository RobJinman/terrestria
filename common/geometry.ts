import { Direction } from "./definitions";
import { BLOCK_SZ } from "./constants";

export function directionToVector(dir: Direction) {
  switch (dir) {
    case Direction.UP: return [0, -BLOCK_SZ];
    case Direction.RIGHT: return [BLOCK_SZ, 0];
    case Direction.DOWN: return [0, BLOCK_SZ];
    case Direction.LEFT: return [-BLOCK_SZ, 0];
    default: return [0, 0];
  }
}

export type Vec2 = {
  x: number;
  y: number;
};

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
