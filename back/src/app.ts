import WebSocket, { Data } from "ws";
import { GameError, ErrorCode } from "./error";
import { Game, GameResponseType, PlayerAction, GameResponse } from "./game";

const SERVER_PORT = 3001;
const MAX_PLAYERS_PER_GAME = 10;
const PING_INTERVAL_MS = 5000;

interface UserConnection {
  ws: WebSocket;
  isAlive: boolean;
  playerId: string;
  game: Game;
}

interface LogInRequest {
  email: string;
  password: string;
}

type HandlerFn = (ws: WebSocket,
                  msg: string,
                  ...extraArgs: any) => Promise<void>;

export class App {
  private _wss: WebSocket.Server;
  private _users: Map<string, UserConnection>;
  private _games: Set<Game>;

  // =======================================================
  // constructor
  // =======================================================
  constructor() {
    this._wss = new WebSocket.Server({ port: SERVER_PORT });
    this._games = new Set<Game>();
    this._users = new Map<string, UserConnection>();

    this._games.add(new Game());

    setInterval(this._checkConnections.bind(this), PING_INTERVAL_MS);

    this._wss.on("connection", ws => {
      console.log("Got connection");
      ws.once("message", msg => this._handleLogIn(ws, msg.toString()));
    });
  }

  // =======================================================
  // _terminateUser
  // =======================================================
  private _terminateUser(id: string) {
    console.log(`Terminating user, id = ${id}`);

    const user = this._users.get(id);

    if (user) {
      user.ws.terminate;
      user.game.removePlayer(id);
      user.ws.terminate();

      if (user.game.numPlayers === 0) {
        console.log("Deleting game " + user.game.id);
        this._games.delete(user.game);
      }
    }

    this._users.delete(id);
  }

  // =======================================================
  // _checkConnections
  // =======================================================
  private _checkConnections() {
    const pendingDelete: string[] = [];

    this._users.forEach(user => {
      if (user.isAlive === false) {
        pendingDelete.push(user.playerId);
      }

      user.isAlive = false;
      user.ws.ping();

      console.log(`PING, id = ${user.playerId}`);
    });

    for (const id of pendingDelete) {
      this._terminateUser(id);
    }
  }

  // =======================================================
  // _sendResponse
  // =======================================================
  private _sendResponse(ws: WebSocket, response: GameResponse) {
    const s = JSON.stringify(response);
    ws.send(s);
  }

  // =======================================================
  // _wrap
  //
  // Should not throw. Wraps an async message handler function in a try-catch
  // block.
  // =======================================================
  private async _wrap(ws: WebSocket,
                      msg: Data,
                      fn: HandlerFn,
                      ...extraArgs: any) {
    try {
      try {
        await fn(ws, msg.toString(), ...extraArgs);
      }
      catch (err) {
        let response: GameResponse = {
          type: GameResponseType.ERROR,
          data: {
            code: err.code,
            message: err.toString()
          }
        };

        this._sendResponse(ws, response);
      }
    }
    catch (err) {
      console.error("Error! " + err);
    }
  }

  // =======================================================
  // _onMessage
  // =======================================================
  private _onMessage(ws: WebSocket, fn: HandlerFn, ...extraArgs: any) {
    ws.on("message", msg => this._wrap(ws, msg, fn, ...extraArgs));
  }

  // =======================================================
  // _assignPlayerToGame
  // =======================================================
  private _assignPlayerToGame(game: Game, playerId: string, token: string) {
    game.addPlayer(playerId, token);
  }

  // =======================================================
  // _assignPlayerToAvailableGame
  // =======================================================
  private _assignPlayerToAvailableGame(playerId: string, token: string): Game {
    let game: Game|null = null;

    this._games.forEach(g => {
      if (g.numPlayers < MAX_PLAYERS_PER_GAME) {
        this._assignPlayerToGame(g, playerId, token);
        game = g;
      }
    });

    if (game === null) {
      game = new Game();
      this._assignPlayerToGame(game, playerId, token);
      this._games.add(game);
    }

    return game;
  }

  // =======================================================
  // _handleLogIn
  //
  // Authenticate against the Pinata servers
  // =======================================================
  private async _handleLogIn(ws: WebSocket, msg: string) {
    console.log("Handling log in");

    let logInReq: LogInRequest|null = null;
    try {
      logInReq = <LogInRequest>JSON.parse(msg);
    }
    catch (err) {
      throw new GameError("Malformed request: " + err,
                          ErrorCode.MALFORMED_REQUEST);
    }

    // TODO: Authenticate against Pinata servers
    console.log("Authenticating");
    const email = logInReq.email;
    const id = "deadbeef";
    const token = "abcdef";

    this._users.set(id, {
      isAlive: true,
      playerId: id,
      ws: ws,
      game: this._assignPlayerToAvailableGame(id, token)
    });

    ws.on("pong", this._handlePong.bind(this, id));
    ws.on("close", this._terminateUser.bind(this, id));

    this._onMessage(ws, this._handleClientMessage.bind(this), id);

    this._sendResponse(ws, {
      type: GameResponseType.LOGIN_SUCCESS,
      data: null
    });
  }

  // =======================================================
  // _handlePong
  // =======================================================
  private _handlePong(id: string) {
    console.log(`PONG, id = ${id}`);

    const conn = this._users.get(id);
    if (conn) {
      conn.isAlive = true;
    }
  }

  // =======================================================
  // _handleClientMessage
  //
  // When a message comes in from the client, pass it onto the game instance
  // =======================================================
  private async _handleClientMessage(ws: WebSocket,
                                     msg: string,
                                     playerId: string) {
    console.log("Handling client message");
    let action: PlayerAction|null = null;

    try {
      action = <PlayerAction>JSON.parse(msg);
    }
    catch (err) {
      throw new GameError("Malformed request: " + err,
                          ErrorCode.MALFORMED_REQUEST);
    }

    const client = this._users.get(playerId);
    if (!client) {
      throw new GameError("No such client", ErrorCode.INTERNAL_ERROR);
    }
    client.game.handlePlayerAction(playerId, action);
  }
}
