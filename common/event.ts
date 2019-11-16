import { EntityId } from "./system";
import { Direction } from "./definitions";

// TODO: Remove strings
export enum GameEventType {
  ENTITY_MOVED = "ENTITY_MOVED",
  ENTITY_SQUASHED = "ENTITY_SQUASHED",
  ENTITY_BURNED = "ENTITY_BURNED",
  AGENT_ENTER_CELL = "AGENT_ENTER_CELL",
  AGENT_ACTION = "AGENT_ACTION",
  PLAYER_KILLED = "PLAYER_KILLED"
}

export interface GameEvent {
  type: GameEventType;
  // List of entities targeted by the event. The exact meaning of this field
  // depends on the event type.
  entities: EntityId[];
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
  direction: Direction;
}

export interface EEntitySquashed extends GameEvent {
  squasherId: EntityId;
  gridX: number;
  gridY: number;
}

export interface EEntityBurned extends GameEvent {}

export enum AgentActionType {
  PUSH = "PUSH",
  RUN = "RUN",
  DIG = "DIG"
}

export interface EAgentAction extends GameEvent {
  agentId: EntityId;
  actionType: AgentActionType;
  direction: Direction;
}

export interface EPlayerKilled extends GameEvent {
  playerId: EntityId;
}
