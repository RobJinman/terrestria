import WebSocket, { Data } from "ws";
import { GameError, ErrorCode } from "./error";
import { Game, GameResponseType, PlayerAction, GameResponse } from "./game";

const SERVER_PORT = 3001;
const MAX_PLAYERS_PER_GAME = 10;
const PING_INTERVAL_MS = 5000;

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
  userId: string|null;
};

interface UserConnection {
  ws: ExtWebSocket;
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

    this._wss.on("connection", ws => this._handleConnection(ws));

    setInterval(() => this._checkConnections(), PING_INTERVAL_MS);
  }

  // =======================================================
  // _handleConnection
  // =======================================================
  private _handleConnection(ws: WebSocket) {
    console.log("Got connection");

    const sock = <ExtWebSocket>ws;
    sock.isAlive = true;
    sock.userId = null;

    ws.on("pong", () => this._handlePong(sock));

    // Interpret the first message as a log in
    ws.once("message", msg => this._handleLogIn(ws, msg.toString()));
  }

  // =======================================================
  // _handlePong
  // =======================================================
  private _handlePong(sock: ExtWebSocket) {
    console.log(`PONG, id = ${sock.userId}`);
    sock.isAlive = true;
  }

  // =======================================================
  // _terminateUser
  // =======================================================
  private _terminateUser(id: string) {
    console.log(`Terminating user, id = ${id}`);

    const user = this._users.get(id);

    if (user) {
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
    this._wss.clients.forEach(ws => {
      const sock = <ExtWebSocket>ws;
      if (sock.isAlive === false) {
        console.log("Terminating connection, id = " + sock.userId);

        sock.terminate();
        if (sock.userId) {
          this._users.delete(sock.userId);
        }
      }
      else {
        console.log(`PING, id = ${sock.userId}`);

        sock.isAlive = false;
        sock.ping();
      }
    });
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

    const sock = <ExtWebSocket>ws;

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

    sock.userId = id;

    this._users.set(id, {
      playerId: id,
      ws: sock,
      game: this._assignPlayerToAvailableGame(id, token)
    });

    ws.on("close", () => this._terminateUser(id));

    this._onMessage(ws, this._handleClientMessage.bind(this), id);

    this._sendResponse(ws, {
      type: GameResponseType.LOGIN_SUCCESS,
      data: null
    });
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
