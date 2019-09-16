import { GameError, ErrorCode } from "./error";

interface Player {
  id: string,
  token: string
}

export enum ActionType {
  MOVE,
  JUMP
}

export interface PlayerAction {
  type: ActionType;
  data: any;
}

export enum GameResponseType {
  ERROR,
  LOGIN_SUCCESS,
  GAME_STATE
}

export interface GameResponse {
  type: GameResponseType;
  data: any;
}

export class Game {
  private static nextGameId: number = 0;

  private _id: number;
  private _players: Map<string, Player>;

  // =======================================================
  // constructor
  // =======================================================
  constructor() {
    this._id = Game.nextGameId++;
    this._players = new Map<string, Player>();

    console.log(`Starting game ${this._id}`);
  }

  // =======================================================
  // addPlayer
  // =======================================================
  addPlayer(id: string, token: string) {
    console.log(`Adding player ${id}`);
    this._players.set(id, { id, token });
  }

  // =======================================================
  // removePlayer
  // =======================================================
  removePlayer(id: string) {
    console.log(`Removing player ${id}`);
    this._players.delete(id);
  }

  // =======================================================
  // numPlayers
  // =======================================================
  get numPlayers() {
    return this._players.size;
  }

  // =======================================================
  // id
  // =======================================================
  get id() {
    return this._id;
  }

  // =======================================================
  // handlePlayerAction
  // =======================================================
  handlePlayerAction(playerId: string, action: PlayerAction) {
    console.log(`Handling player action, playerId = ${playerId}`);
    console.log(action);

    switch (action.type) {
      case ActionType.MOVE: {
        console.log("Player moved");
        break;
      }
      case ActionType.JUMP: {
        console.log("Player jumped");
        break;
      }
      default: {
        throw new GameError(`No such action '${action.type}'`,
                            ErrorCode.BAD_REQUEST);
      }
    }
  }
}
