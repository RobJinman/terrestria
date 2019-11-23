import { ComponentPacket } from "./system";

export enum SpatialMode {
  GRID_MODE = "GRID_MODE",
  FREE_MODE = "FREE_MODE"
}

export interface SpatialComponentPacket extends ComponentPacket {
  mode: SpatialMode;
  x: number;
  y: number;
  speed: number;
}
