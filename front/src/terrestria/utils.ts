import { PIXEL_SZ, WORLD_UNIT } from "./constants";

export function toPixels(x: number) {
  return x * WORLD_UNIT;
}

export function toWorldUnits(x: number) {
  return x * PIXEL_SZ;
}
