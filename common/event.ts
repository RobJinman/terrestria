import { EntityId } from "./system";
import { Direction } from "./definitions";

// TODO: Remove strings
export enum GameEventType {
  ENTITY_MOVED = "ENTITY_MOVED",
  ENTITY_SQUASHED = "ENTITY_SQUASHED",
  ENTITY_HIT = "ENTITY_HIT",
  ENTITY_BURNED = "ENTITY_BURNED",
  ENTITY_COLLISION = "ENTITY_COLLISION",
  ENTITY_HIERARCHY_CHANGED = "ENTITY_HIERARCHY_CHANGED",
  AGENT_ENTER_CELL = "AGENT_ENTER_CELL",
  AGENT_BLOCKED = "AGENT_BLOCKED",
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

export interface EAgentBlocked extends GameEvent {
  entityId: EntityId;
  gridX: number;
  gridY: number;
  direction: Direction;
}

export interface EEntityHit extends GameEvent {
  hitterId: EntityId;
  gridX: number;
  gridY: number;
}

export interface EEntitySquashed extends GameEvent {
  squasherId: EntityId;
  gridX: number;
  gridY: number;
}

export interface EEntityBurned extends GameEvent {}

export interface EEntityCollision extends GameEvent {
  entityA: EntityId;
  entityB: EntityId;
}

export enum EntityHierarchyChangeType {
  ADDITION = "ADDITION",
  REMOVAL = "REMOVAL"
}

export interface EEntityHierarchyChanged extends GameEvent {
  parent: EntityId;
  child: EntityId;
  changeType: EntityHierarchyChangeType;
}

export enum AgentActionType {
  PUSH = "PUSH",
  RUN = "RUN",
  DIG = "DIG",
  JUMP = "JUMP",
  COLLECT = "COLLECT"
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
