import { Engine, World, Bodies, Body } from "matter-js";
import { EntityId } from "./common/system";
import { Direction } from "./common/definitions";
import { FreeModeSubcomponent } from "./free_mode_subcomponent";
import { SERVER_FRAME_RATE, BLOCK_SZ } from "./common/constants";
import { Span2d, getPerimeter, EdgeOrientation,
         orientation } from "./common/span";

export class FreeModeImpl {
  private _w: number;
  private _h: number;
  private _engine = Engine.create();
  private _components = new Map<number, FreeModeSubcomponent>();

  constructor(w: number, h: number, gravRegion: Span2d) {
    this._w = w;
    this._h = h;

    const fenceThickness = 1;
    const perimeter = getPerimeter(gravRegion);
    for (const edge of perimeter) {
      const x = Math.min(edge.A.x, edge.B.x) * BLOCK_SZ;
      const y = Math.min(edge.A.y, edge.B.y) * BLOCK_SZ;
      const w = Math.abs(edge.B.x - edge.A.x) * BLOCK_SZ;
      const h = Math.abs(edge.B.y - edge.A.y) * BLOCK_SZ;

      let body: Body;

      if (orientation(edge) == EdgeOrientation.VERTICAL) {
        body = Bodies.rectangle(x, y, fenceThickness, h, { isStatic: true });
      }
      else {
        body = Bodies.rectangle(x, y, w, fenceThickness, { isStatic: true });
      }
  
      if (body) {
        World.add(this._engine.world, body);
      }
    }
  }

  update() {
    Engine.update(this._engine, 1000.0 / SERVER_FRAME_RATE);
  }

  addComponent(c: FreeModeSubcomponent) {
    this._components.set(c.entityId, c);

    const toMatterJsY = (y: number, h: number) => this._h * BLOCK_SZ - y - h;
    const fromMatterJsY = (y: number, h: number) => this._h * BLOCK_SZ - y - h;
    c.init(toMatterJsY, fromMatterJsY);

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
