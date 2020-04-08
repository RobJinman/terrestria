import { ComponentPacket } from "./system";

export enum SpatialMode {
  GRID_MODE = "GRID_MODE",
  FREE_MODE = "FREE_MODE"
}

export interface SpatialPacket extends ComponentPacket {
  mode: SpatialMode;
  x: number;
  y: number;
  angle: number;
  speed: number;
  teleport: boolean;
}
