import { ComponentPacket, EntityId, Entity } from "./entity_manager";
import { ErrorCode } from "./error";

export enum GameResponseType {
  ERROR = "ERROR",
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  GAME_STATE = "GAME_STATE",
  NEW_ENTITIES = "NEW_ENTITIES",
  ENTITIES_DELETED = "ENTITIES_DELETED"
}

export interface GameResponse {
  type: GameResponseType;
}

export interface RError extends GameResponse {
  code: ErrorCode;
  message: string;
}

export interface RLoginSuccess extends GameResponse {
  playerId: EntityId;
}

export interface RGameState extends GameResponse {
  packets: ComponentPacket[];
  frameNumber: number;
}

export interface RNewEntities extends GameResponse {
  entities: Entity[];
}

export interface REntitiesDeleted extends GameResponse {
  entities: Entity[];
}
