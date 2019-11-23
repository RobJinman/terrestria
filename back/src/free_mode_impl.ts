import { Engine, World } from "matter-js";
import { EntityId } from "./common/system";
import { Direction } from "./common/definitions";
import { FreeModeSubcomponent } from "./free_mode_subcomponent";
import { SERVER_FRAME_RATE, BLOCK_SZ } from "./common/constants";

export class FreeModeImpl {
  private _w: number;
  private _h: number;
  private _engine = Engine.create();
  private _components = new Map<number, FreeModeSubcomponent>();

  constructor(w: number, h: number) {
    this._w = w;
    this._h = h;
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
