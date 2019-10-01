import { ComponentType } from "./component_types";
import { BLOCK_SZ } from "./config";
import { ComponentPacket, Component, EntityId } from "./system";
import { Direction } from "./definitions";

export function directionToVector(dir: Direction) {
  switch (dir) {
    case Direction.UP: return [0, BLOCK_SZ];
    case Direction.RIGHT: return [BLOCK_SZ, 0];
    case Direction.DOWN: return [0, -BLOCK_SZ];
    case Direction.LEFT: return [-BLOCK_SZ, 0];
    default: return [0, 0];
  }
}

export type Vec2 = {
  x: number;
  y: number;
};

export interface SpatialComponentPacket extends ComponentPacket {
  x: number;
  y: number;
}

export interface PhysicalProperties {
  // If it blocks other objects (except agents) from occupying the same space
  solid: boolean;
  // If it blocks agents from occupying the same space
  blocking: boolean;
  // If it falls due to gravity (when there's no solid object supporting it)
  heavy: boolean;
  // If an agent can move it
  moveable: boolean;
  // If a playable agent
  isAgent: boolean;
}

export class SpatialComponent extends Component {
  dirty = true;
  private _pos: Vec2 = { x: 0, y: 0 };

  private _solid: boolean;
  private _blocking: boolean;
  private _heavy: boolean;
  private _moveable: boolean;
  private _isAgent: boolean;

  velocity: Vec2 = { x: 0, y: 0 };
  dest: Vec2 = { x: 0, y: 0 };

  falling = false;

  constructor(entityId: EntityId, properties: PhysicalProperties) {
    super(entityId, ComponentType.SPATIAL);

    this._solid = properties.solid;
    this._blocking = properties.blocking;
    this._heavy = properties.heavy;
    this._moveable = properties.moveable;
    this._isAgent = properties.isAgent;
  }

  moving() {
    return this.movingInX() || this.movingInY();
  }

  movingInX() {
    return Math.abs(this.velocity.x) > 0.5;
  }

  movingInY() {
    return Math.abs(this.velocity.y) > 0.5;
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

  get solid() {
    return this._solid;
  }

  get blocking() {
    return this._blocking;
  }

  get heavy() {
    return this._heavy;
  }

  get moveable() {
    return this._moveable;
  }

  get isAgent() {
    return this._isAgent;
  }
}
