import { EntityId } from "./system";
import { Direction } from "./definitions";

export enum GameEventType {
  ENTITY_MOVED,
  ENTITY_SQUASHED,
  AGENT_ENTER_CELL,
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

export interface EAgentEnterCell extends GameEvent {
  entityId: EntityId;
  prevGridX: number;
  prevGridY: number;
  gridX: number;
  gridY: number;
}

export interface EAgentBeginMove extends GameEvent {
  entityId: EntityId;
  gridX: number;
  gridY: number;
  direction: Direction;
}

export interface EEntitySquashed extends GameEvent {
  squasherId: EntityId;
  gridX: number;
  gridY: number;
}
