import { EntityId } from "./common/system";
import { SpatialSubcomponent } from "./spatial_subcomponent";
import { Direction } from "./common/definitions";

export type AttemptModeTransitionFn = (entityId: EntityId,
                                       destX: number,
                                       destY: number,
                                       direction?: Direction) => boolean;

export abstract class SpatialModeImpl {
  abstract getComponent(id: EntityId): SpatialSubcomponent;
  abstract update(): void;
  // Return false if the entity cannot be moved into that position
  abstract addComponent(c: SpatialSubcomponent,
                        x: number,
                        y: number,
                        direction?: Direction): boolean;
  abstract removeComponent(c: SpatialSubcomponent): void;
  abstract moveAgent(id: EntityId, direction: Direction): boolean;
}
