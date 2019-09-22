import { ComponentPacket, EntityId, Entity } from "./entity_manager";
import { ErrorCode } from "./error";

export enum GameResponseType {
  ERROR = "ERROR",
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  GAME_STATE = "GAME_STATE",
  NEW_ENTITIES = "NEW_ENTITIES"
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
}

export interface RNewEntity extends GameResponse {
  newEntities: Entity[];
}
