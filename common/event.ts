import { EntityId } from "./entity_manager";
import { Direction } from "./definitions";

export enum GameEventType {
  ENTITY_MOVED
}

export interface GameEvent {
  type: GameEventType;
}

export interface EEntityMoved extends GameEvent {
  entityId: EntityId;
  x: number;
  y: number;
}

export interface EAgentBeginMove extends GameEvent {
  entityId: EntityId;
  destCol: number;
  destRow: number;
  direction: Direction;
}
