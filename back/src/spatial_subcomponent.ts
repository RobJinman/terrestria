export abstract class SpatialSubcomponent {
  abstract x(): number;
  abstract y(): number;
  // Set position without changing destination or speed
  abstract setInstantaneousPos(x: number, y: number): void;
  // Set the position and stop the entity moving
  abstract setStaticPos(x: number, y: number): void;
}
