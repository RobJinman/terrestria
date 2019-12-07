import { EntityId } from "./system";
import { Direction } from "./definitions";

// TODO: Remove strings
export enum GameEventType {
  ENTITY_MOVED = "ENTITY_MOVED",
  ENTITY_SQUASHED = "ENTITY_SQUASHED",
  ENTITY_BURNED = "ENTITY_BURNED",
  AGENT_ENTER_CELL = "AGENT_ENTER_CELL",
  AGENT_ACTION = "AGENT_ACTION",
  PLAYER_KILLED = "PLAYER_KILLED",
  WINDOW_RESIZED = "WINDOW_RESIZED",
  AWARD_GRANTED = "AWARD_GRANTED"
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

export interface EWindowResized extends GameEvent {
  w: number;
  h: number;
}

export interface EAwardGranted extends GameEvent {
  name: string;
  fetti: number;
}
