import { Component, EntityId } from "./common/system";
import { FreeModeSubcomponent } from "./free_mode_impl";
import { EntityManager } from "./common/entity_manager";
import { ComponentType } from "./common/component_types";
import { GridModeSubcomponent } from "./grid_mode_subcomponent";
import { Grid } from "./grid";
import { FreeModeProperties } from "./free_mode_properties";
import { GridModeProperties } from "./grid_mode_properties";

export enum SpatialMode {
  GRID_MODE,
  FREE_MODE
}

export class ServerSpatialComponent extends Component {
  currentMode: SpatialMode = SpatialMode.GRID_MODE;
  gridMode: GridModeSubcomponent;
  freeMode: FreeModeSubcomponent;

  constructor(entityId: EntityId,
              entityManager: EntityManager,
              grid: Grid,
              gridModeProperties: GridModeProperties,
              freeModeProperties: FreeModeProperties) {
    super(entityId, ComponentType.SPATIAL);

    this.gridMode = new GridModeSubcomponent(entityId,
                                             entityManager,
                                             grid,
                                             gridModeProperties);
    this.freeMode = new FreeModeSubcomponent(freeModeProperties);
  }

  isDirty() {
    return this.gridMode.dirty || this.freeMode.dirty;
  }

  setClean() {
    this.gridMode.dirty = false;
    this.freeMode.dirty = false;
  }

  get x() {
    return this.currentMode == SpatialMode.GRID_MODE ?
      this.gridMode.x() :
      this.freeMode.x();
  }

  get y() {
    return this.currentMode == SpatialMode.GRID_MODE ?
      this.gridMode.y() :
      this.freeMode.y();
  }

  setInstantaneousPos(x: number, y: number) {
    if (this.currentMode == SpatialMode.GRID_MODE) {
      this.gridMode.setInstantaneousPos(x, y);
    }
    else if (this.currentMode == SpatialMode.FREE_MODE) {
      this.freeMode.setInstantaneousPos(x, y);
    }
  }

  setStaticPos(x: number, y: number) {
    if (this.currentMode == SpatialMode.GRID_MODE) {
      this.gridMode.setStaticPos(x, y);
    }
    else if (this.currentMode == SpatialMode.FREE_MODE) {
      this.freeMode.setStaticPos(x, y);
    }
  }
}