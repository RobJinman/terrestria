import WebSocket from "ws";
import { GameError, ErrorCode } from "./error";
import { Game } from "./game";
import { ActionType, LogInPayload, deserialiseMessage } from "./action";
import { GameResponse, GameResponseType } from "./response";
import { pinataAuth } from "./pinata";
import { EntityId } from "./entity_manager";

const SERVER_PORT = 3001;
const MAX_PLAYERS_PER_GAME = 10;
const PING_INTERVAL_MS = 5000;

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
  userId: EntityId|null;
};

interface UserConnection {
  ws: ExtWebSocket;
  playerId: EntityId;
  game: Game;
}

type HandlerFn = (...args: any) => Promise<void>;

export class App {
  private _wss: WebSocket.Server;
  private _users: Map<EntityId, UserConnection>;
  private _games: Set<Game>;

  constructor() {
    this._wss = new WebSocket.Server({ port: SERVER_PORT });
    this._games = new Set<Game>();
    this._users = new Map<EntityId, UserConnection>();

    this._games.add(new Game());

    this._wss.on("connection", ws => this._handleConnection(ws));

    setInterval(() => this._checkConnections(), PING_INTERVAL_MS);
  }

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

  private _handlePong(sock: ExtWebSocket) {
    console.log(`PONG, id = ${sock.userId}`);
    sock.isAlive = true;
  }

  private _terminateUser(id: EntityId) {
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

  private _sendResponse(ws: WebSocket, response: GameResponse) {
    const s = JSON.stringify(response);
    ws.send(s);
  }

  // Wraps an async function in a try-catch block and returns an error response
  // over the websocket on error.
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

  private _chooseAvailableGame(): Game {
    this._games.forEach(game => {
      if (game.numPlayers < MAX_PLAYERS_PER_GAME) {
        return game;
      }
    });

    const game = new Game();
    this._games.add(game);

    return game;
  }

  private async _handleLogIn(sock: ExtWebSocket, data: LogInPayload) {
    console.log("Handling log in");

    let pinataId: string = "";
    let pinataToken: string = "";

    try {
      const auth = await pinataAuth(data);
      pinataId = auth.accountId;
      pinataToken = auth.token;

      console.log(`Logged into pinata account ${pinataId} with token ` +
                  `${pinataToken}`);
    }
    catch (err) {
      throw new GameError("Couldn't log into pinata: " + err,
                          ErrorCode.AUTHENTICATION_FAILURE);
    }

    const game = this._chooseAvailableGame();
    const entityId = game.addPlayer(pinataId, pinataToken);

    sock.userId = entityId;

    this._users.set(entityId, {
      playerId: entityId,
      ws: sock,
      game
    });

    sock.on("close", () => this._terminateUser(entityId));

    this._sendResponse(sock, {
      type: GameResponseType.LOGIN_SUCCESS,
      data: null
    });
  }

  // When a message comes in from the client, pass it onto the game instance
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
