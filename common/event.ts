import { EntityId } from "./entity_manager";

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
