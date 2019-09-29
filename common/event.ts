import { EntityId } from "./entity_manager";
import { Direction } from "./definitions";

export enum GameEventType {
  ENTITY_MOVED,
  AGENT_BEGIN_MOVE
}

export interface GameEvent {
  type: GameEventType;
  // Set of entities targeted by the event. The exact meaning of this field
  // depends on the event type.
  entities: Set<EntityId>;
}

export interface EEntityMoved extends GameEvent {
  entityId: EntityId;
  x: number;
  y: number;
}

export interface EAgentBeginMove extends GameEvent {
  entityId: EntityId;
  gridX: number;
  gridY: number;
  direction: Direction;
}
