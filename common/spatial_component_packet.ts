import { ComponentPacket } from "./system";

export interface SpatialComponentPacket extends ComponentPacket {
  x: number;
  y: number;
  speed: number;
}
