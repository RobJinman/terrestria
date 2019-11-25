import { Engine, World, Bodies, Body, Vector, Events } from "matter-js";
import { EntityId } from "./common/system";
import { Direction } from "./common/definitions";
import { FreeModeSubcomponent } from "./free_mode_subcomponent";
import { SERVER_FRAME_RATE, BLOCK_SZ } from "./common/constants";
import { Span2d, getPerimeter, EdgeOrientation,
         orientation } from "./common/span";
import { GameError } from "./common/error";
import { directionToVector, normalise, Vec2 } from "./common/geometry";
import { SpatialModeImpl, AttemptModeTransitionFn } from "./spatial_mode_impl";

const PLAYER_VELOCITY_H = 4;
const PLAYER_VELOCITY_V = 6;

export class FreeModeImpl implements SpatialModeImpl {
  private _engine = Engine.create();
  private _gravRegion: Span2d;
  private _componentsByEntityId = new Map<number, FreeModeSubcomponent>();
  private _componentsByBodyId = new Map<number, FreeModeSubcomponent>();
  private _attemptModeTransitionFn: AttemptModeTransitionFn;

  constructor(gravRegion: Span2d,
              attemptModeTransitionFn: AttemptModeTransitionFn) {
    this._gravRegion = gravRegion;
    this._attemptModeTransitionFn = attemptModeTransitionFn;

    this._setupFences();

    Events.on(this._engine, "collisionStart", event => {
      event.pairs.forEach(pair => {
        const a = this._componentsByBodyId.get(pair.bodyA.id);
        const b = this._componentsByBodyId.get(pair.bodyB.id);
        if (a && b) {
          console.log(`${a.entityId} collided with ${b.entityId}`);
        }
      });
    });
  }

  update() {
    Engine.update(this._engine, 1000.0 / SERVER_FRAME_RATE);
  }

  addComponent(c: FreeModeSubcomponent,
               x: number,
               y: number,
               direction?: Direction): boolean {
    this._componentsByEntityId.set(c.entityId, c);
    this._componentsByBodyId.set(c.body.id, c);

    c.setStaticPos(x, y);

    World.add(this._engine.world, c.body);

    return true;
  }

  getComponent(id: EntityId): FreeModeSubcomponent {
    const c = this._componentsByEntityId.get(id);
    if (!c) {
      throw new GameError(`No spatial component for entity ${id}`);
    }
    return c;
  }

  removeComponent(c: FreeModeSubcomponent) {
    World.remove(this._engine.world, c.body);
    this._componentsByEntityId.delete(c.entityId);
    this._componentsByBodyId.delete(c.body.id);
  }

  moveAgent(id: EntityId, direction: Direction): boolean {
    const c = this.getComponent(id);

    console.log(`Moving agent ${direction}`);

    if (!this._tryLeaveGravRegion(c, direction)) {
      const vec = directionToVector(direction);
      normalise(vec);

      vec.x *= PLAYER_VELOCITY_H;
      vec.y *= PLAYER_VELOCITY_V;
  
      Body.setVelocity(c.body, Vector.create(vec.x, vec.y));
    }
  
    return true;
  }

  private _tryLeaveGravRegion(c: FreeModeSubcomponent,
                              direction: Direction): boolean {

    const v = directionToVector(direction);
    const u = directionToVector(direction);
    normalise(u);

    const probeLen = BLOCK_SZ * 0.25;
    const probe = {
      x: v.x + u.x * probeLen,
      y: v.y + u.x * probeLen
    };

    const centreX = c.x() + 0.5 * BLOCK_SZ;
    const centreY = c.y() + 0.5 * BLOCK_SZ;

    const gridX = Math.floor((centreX + probe.x) / BLOCK_SZ);
    const gridY = Math.floor((centreY + probe.y) / BLOCK_SZ);

    if (!this._gravRegion.contains(gridX, gridY)) {
      return this._attemptModeTransitionFn(c.entityId, direction);
    }

    return false;
  }

  private _setupFences() {
    const fenceThickness = 32;
    const perimeter = getPerimeter(this._gravRegion);

    for (const edge of perimeter) {
      const w = Math.abs(edge.B.x - edge.A.x) * BLOCK_SZ;
      const h = Math.abs(edge.B.y - edge.A.y) * BLOCK_SZ;
      let x = Math.min(edge.A.x, edge.B.x) * BLOCK_SZ;
      let y = Math.min(edge.A.y, edge.B.y) * BLOCK_SZ;

      let body: Body;

      if (orientation(edge) == EdgeOrientation.VERTICAL) {
        if (edge.A.y > edge.B.y) {
          x -= fenceThickness;
        }
        body = Bodies.rectangle(x, y, fenceThickness, h, { isStatic: true });
      }
      else {
        if (edge.B.x > edge.A.x) {
          y -= fenceThickness;
        }
        body = Bodies.rectangle(x, y, w, fenceThickness, { isStatic: true });
      }

      if (body) {
        Body.translate(body, Vector.sub(body.position, body.bounds.min));
        World.add(this._engine.world, body);
      }
    }
  }
}
