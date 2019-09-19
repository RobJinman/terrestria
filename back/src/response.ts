export enum GameResponseType {
  ERROR = "ERROR",
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  GAME_STATE = "GAME_STATE"
}

export interface GameResponse {
  type: GameResponseType;
  data: any;
}
