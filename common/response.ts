import { Entity } from "./entity_manager";
import { ErrorCode } from "./error";
import { EntityId, ComponentPacket } from "./system";
import { GameEvent } from "./event";
import { MapData } from "./map_data";

export enum GameResponseType {
  ERROR = "ERROR",
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
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

export interface RLoginSuccess extends GameResponse {
  playerId: EntityId;
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
