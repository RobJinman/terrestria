import { PinataApiErrorCode } from "./pinata_api";
import { Entity } from "./entity_manager";
import { ErrorCode } from "./error";
import { EntityId, ComponentPacket } from "./system";
import { GameEvent } from "./event";
import { MapData } from "./map_data";

// TODO: Use numbers, not strings
export enum GameResponseType {
  ERROR = "ERROR",
  JOIN_GAME_SUCCESS = "JOIN_GAME_SUCCESS",
  LOG_IN_SUCCESS = "LOG_IN_SUCCESS",
  SIGN_UP_SUCCESS = "SIGN_UP_SUCCESS",
  SIGN_UP_FAILURE = "SIGN_UP_FAILURE",
  MAP_DATA = "MAP_DATA",
  GAME_STATE = "GAME_STATE",
  NEW_ENTITIES = "NEW_ENTITIES",
  ENTITIES_DELETED = "ENTITIES_DELETED",
  EVENT = "EVENT",
  PLAYER_KILLED = "PLAYER_KILLED",
  NEW_PLAYER_ID = "NEW_PLAYER_ID"
}

export type ClientMapData = Omit<MapData, "entities">;

export interface GameResponse {
  type: GameResponseType;
}

export interface RError extends GameResponse {
  code: ErrorCode;
  message: string;
}

export interface RJoinGameSuccess extends GameResponse {
  playerId: EntityId;
}

export interface RLogInSuccess extends GameResponse {
  username: string;
  pinataId: string;
  pinataToken: string;
}

export interface RSignUpSuccess extends GameResponse {
  username: string;
}

export interface RSignUpFailure extends GameResponse {
  reason: PinataApiErrorCode;
}

export interface RMapData extends GameResponse {
  mapData: ClientMapData
}

export interface RGameState extends GameResponse {
  packets: ComponentPacket[];
}

export interface RNewEntities extends GameResponse {
  entities: Entity[];
}

export interface REntitiesDeleted extends GameResponse {
  entities: Entity[];
}

export interface REvent extends GameResponse {
  event: GameEvent;
}

export interface RPlayerKilled extends GameResponse {}

export interface RNewPlayerId extends GameResponse {
  playerId: EntityId;
}
