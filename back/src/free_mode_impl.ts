import { Engine, World, Bodies, Body, Vector } from "matter-js";
import { EntityId } from "./common/system";
import { Direction } from "./common/definitions";
import { FreeModeSubcomponent } from "./free_mode_subcomponent";
import { SERVER_FRAME_RATE, BLOCK_SZ } from "./common/constants";
import { Span2d, getPerimeter, EdgeOrientation,
         orientation } from "./common/span";

export class FreeModeImpl {
  private _engine = Engine.create();
  private _components = new Map<number, FreeModeSubcomponent>();

  constructor(gravRegion: Span2d) {
    const fenceThickness = 32;
    const perimeter = getPerimeter(gravRegion);

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

  update() {
    Engine.update(this._engine, 1000.0 / SERVER_FRAME_RATE);
  }

  addComponent(c: FreeModeSubcomponent) {
    this._components.set(c.entityId, c);

    World.add(this._engine.world, c.body);
  }

  removeComponent(c: FreeModeSubcomponent) {
    World.remove(this._engine.world, c.body);
    this._components.delete(c.entityId);
  }

  moveAgent(id: EntityId, direction: Direction): boolean {
    // TODO
    return false;
  }
}
