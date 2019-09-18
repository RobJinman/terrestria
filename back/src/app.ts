import https from "https";
import http from "http";
import WebSocket from "ws";
import { GameError, ErrorCode } from "./error";
import { Game, GameResponseType, GameResponse } from "./game";
import { ActionType, LogInPayload, deserialiseMessage } from "./actions";

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

interface PinataAuthResponse {
  accountId: string;
  token: string;
}

type HandlerFn = (...args: any) => Promise<void>;

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

    ws.on("message", data => {
      this._wrap(ws, () => this._handleClientMessage(sock, data.toString()));
    });
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
  // Wraps an async function in a try-catch block and returns an error response
  // over the websocket on error.
  // =======================================================
  private async _wrap(ws: WebSocket, fn: HandlerFn) {
    try {
      try {
        await fn();
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
  // _pinataAuth
  //
  // Authenticate against the Pinata servers
  // =======================================================
  private async _pinataAuth(logInReq: LogInRequest):
    Promise<PinataAuthResponse> {

    console.log("Authenticating");

    return new Promise<PinataAuthResponse>((resolve, reject) => {
      const email = logInReq.email;
      const password = logInReq.password;

      const body = {
        email,
        password
      };

      const payload = JSON.stringify(body);

      console.log(payload);

      const options: http.RequestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": payload.length,
        },
        agent: false
      };

      const url = "http://localhost:3000/gamer/log-in";

      let req = http.request(url, options, res => {
        let json = "";

        res.on("data", chunk => {
          json += chunk;
        })

        res.on("end", () => {
          try {
            if (res.statusCode != 200) {
              reject(`Error authenticating user: Status ${res.statusCode}`);
            }
            const data = JSON.parse(json);
            resolve(data);
          }
          catch (err) {
            reject("Error authenticating user: " + err);
          }
        });
      });

      req.on("error", err => {
        reject("Error authenticating user: " + err);
      });

      req.write(payload);
      req.end();
    });
  }

  // =======================================================
  // _handleLogIn
  // =======================================================
  private async _handleLogIn(sock: ExtWebSocket, data: LogInPayload) {
    console.log("Handling log in");

    let id: string = "";
    let token: string = "";

    try {
      const auth = await this._pinataAuth(data);
      id = auth.accountId;
      token = auth.token;

      console.log(`Logged in as player ${id} with token ${token}`);
    }
    catch (err) {
      throw new GameError("Couldn't log into pinata: " + err,
                          ErrorCode.AUTHENTICATION_FAILURE);
    }

    sock.userId = id;

    this._users.set(id, {
      playerId: id,
      ws: sock,
      game: this._assignPlayerToAvailableGame(id, token)
    });

    sock.on("close", () => this._terminateUser(id));

    this._sendResponse(sock, {
      type: GameResponseType.LOGIN_SUCCESS,
      data: null
    });
  }

  // =======================================================
  // _handleClientMessage
  //
  // When a message comes in from the client, pass it onto the game instance
  // =======================================================
  private async _handleClientMessage(sock: ExtWebSocket,
                                     msg: string) {
    console.log("Handling client message");
    const action = deserialiseMessage(msg);

    if (action.type === ActionType.LOG_IN) {
      const data = <LogInPayload>action.data;
      await this._handleLogIn(sock, data);
    }
    else {
      if (!sock.userId) {
        throw new GameError("User not logged in", ErrorCode.NOT_AUTHORISED);
      }

      const client = this._users.get(sock.userId);
      if (!client) {
        throw new GameError("No such client", ErrorCode.INTERNAL_ERROR);
      }
      client.game.handlePlayerAction(sock.userId, action);
    }
  }
}
