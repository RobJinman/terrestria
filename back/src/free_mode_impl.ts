import { SpatialSubcomponent } from "./spatial_subcomponent";
import { SpatialComponent } from "./spatial_component";
import { FreeModeProperties } from "./free_mode_properties";
import { EntityId } from "./common/system";
import { Direction } from "./common/definitions";

export class FreeModeSubcomponent implements SpatialSubcomponent {
  dirty = true;

  private _properties: FreeModeProperties;
  private _posX = 0;
  private _posY = 0;

  constructor(properties: FreeModeProperties) {
    this._properties = properties;
  }

  setInstantaneousPos(x: number, y: number) {
    // TODO
  }

  setStaticPos(x: number, y: number) {
    // TODO
  }

  x() {
    return this._posX;
  }

  y() {
    return this._posY;
  }
}

export class FreeModeImpl {
  private _components = new Map<number, SpatialComponent>();

  constructor() {}

  setComponentsMap(components: Map<number, SpatialComponent>) {
    this._components = components;
  }

  update() {
    // TODO
  }

  onComponentAdded(c: SpatialComponent) {
    // TODO
  }

  onComponentRemoved(c: SpatialComponent) {
    // TODO
  }

  moveAgent(id: EntityId, direction: Direction): boolean {
    // TODO
    return false;
  }
}
