import { Component, EntityId } from "./common/system";
import { GridModeSubcomponent } from "./grid_mode_subcomponent";
import { FreeModeSubcomponent } from "./free_mode_subcomponent";
import { Grid } from "./grid";
import { GridModeProperties } from "./grid_mode_properties";
import { FreeModeProperties } from "./free_mode_properties";
import { ComponentType } from "./common/component_types";
import { SpatialMode } from "./common/spatial_packet";
import { Shape } from "./common/geometry";

export class CSpatial extends Component {
  currentMode: SpatialMode = SpatialMode.GRID_MODE;
  gridMode: GridModeSubcomponent;
  freeMode: FreeModeSubcomponent;

  constructor(entityId: EntityId,
              isLocalOnly: boolean,
              grid: Grid,
              gridModeProperties: GridModeProperties,
              freeModeProperties: FreeModeProperties,
              shape?: Shape) {
    super(entityId, ComponentType.SPATIAL, isLocalOnly);

    this.gridMode = new GridModeSubcomponent(entityId,
                                             grid,
                                             gridModeProperties);
    this.freeMode = new FreeModeSubcomponent(entityId,
                                             freeModeProperties,
                                             shape);
  }

  isDirty() {
    if (this.currentMode == SpatialMode.GRID_MODE) {
      return this.gridMode.isDirty();
    }
    else {
      return this.freeMode.isDirty();
    }
  }

  setClean() {
    this.gridMode.setClean();
    this.freeMode.setClean();
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