import { EntityId } from "./system";
import { Direction } from "./definitions";
import { EntityType } from "./game_objects";

// TODO: Remove strings
// TODO: Naming convention for server/client/common events
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
  AWARD_GRANTED = "AWARD_GRANTED",
  GEMS_BANKED = "GEMS_BANKED",
  AGENT_SCORE_CHANGED = "AGENT_SCORE_CHANGED",
  GAME_ENDING = "GAME_ENDING",

  // Client-side only
  CLIENT_SCORE_CHANGED = "CLIENT_SCORE_CHANGED",
  PLAYER_RESPAWNED = "PLAYER_RESPAWNED",
  WINDOW_RESIZED = "WINDOW_RESIZED",
  CLIENT_AWARD_GRANTED = "CLIENT_AWARD_GRANTED",
  AWARD_DISPLAYED = "AWARD_DISPLAYED"
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
  collectedType?: EntityType;
}

export interface EGemsBanked extends GameEvent {
  playerId: EntityId;
  numGems: number;
}

export interface EAgentScoreChanged extends GameEvent {
  agentId: EntityId;
  score: number;
}

export interface EPlayerKilled extends GameEvent {
  playerId: EntityId;
}

export interface EAwardGranted extends GameEvent {
  playerId: EntityId;
  name: string;
  fetti: number;
  loggedOut: boolean;
}

export interface EGameEnding extends GameEvent {
  secondsRemaining: number;
}

// Client-side only
//

export interface EWindowResized extends GameEvent {
  w: number;
  h: number;
}

export interface EClientScoreChanged extends GameEvent {
  score: number;
}

export interface EPlayerRespawned extends GameEvent {}

export interface EClientAwardGranted extends GameEvent {
  name: string;
  fetti: number;
  loggedOut: boolean;
}

export interface EAwardDisplayed extends GameEvent {}
