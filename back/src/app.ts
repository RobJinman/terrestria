import http from "http";
import WebSocket from "ws";
import { GameError, ErrorCode } from "./common/error";
import { Game } from "./game";
import { ActionType, LogInAction, deserialiseMessage,
         RespawnAction, 
         JoinGameAction} from "./common/action";
import { GameResponse, GameResponseType, RError, RLoginSuccess, 
         RNewPlayerId, 
         RJoinGameSuccess} from "./common/response";
import { Pinata } from "./pinata";
import { EntityId } from "./common/system";
import { AppConfig, makeAppConfig } from "./config";
import { Logger } from "./logger";

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
  pinataId?: string;
  pinataToken?: string;
  game: Game;
}

type HandlerFn = (...args: any) => Promise<void>;

export class App {
  private _config: AppConfig;
  private _logger = new Logger();
  private _server: http.Server;
  private _wss: WebSocket.Server;
  private _users: Map<EntityId, UserConnection>;
  private _games: Set<Game>;
  private _pinata: Pinata;

  constructor() {
    this._config = makeAppConfig();

    this._server = http.createServer((req, res) => {
      this._handleHttpRequest(req, res);
    });

    this._pinata = new Pinata(this._config.pinataApiBase,
                              this._config.productKey,
                              this._logger);

    this._wss = new WebSocket.Server({ server: this._server });;
    this._games = new Set<Game>();
    this._users = new Map<EntityId, UserConnection>();

    this._wss.on("connection", ws => this._handleConnection(ws));

    this._server.listen(SERVER_PORT);

    setInterval(() => this._checkConnections(), PING_INTERVAL_MS);
  }

  private _handleHttpRequest(req: http.IncomingMessage,
                             res: http.ServerResponse) {
    if (req.url == "/health") {
      res.statusCode = 200;
      res.write("Still alive!");
    }
    else {
      res.statusCode = 404;
    }

    res.end();
  }

  private _handleConnection(ws: WebSocket) {
    this._logger.info("Got connection");

    const sock = <ExtWebSocket>ws;
    sock.isAlive = true;
    sock.userId = null;

    ws.on("pong", () => this._handlePong(sock));

    ws.on("message", data => {
      this._wrap(ws, () => this._handleClientMessage(sock, data.toString()));
    });
  }

  private _handlePong(sock: ExtWebSocket) {
    sock.isAlive = true;
  }

  private _terminateUser(id: EntityId) {
    this._logger.info(`Terminating user, id = ${id}`);

    const user = this._users.get(id);

    if (user) {
      if (user.game.hasPlayer(id)) {
        user.game.removePlayer(id);
      }
      user.ws.terminate();

      if (user.game.numPlayers === 0) {
        this._logger.info("Deleting game " + user.game.id);
        user.game.terminate();
        this._games.delete(user.game);
      }
    }

    this._users.delete(id);
  }

  private _checkConnections() {
    this._wss.clients.forEach(ws => {
      const sock = <ExtWebSocket>ws;
      if (sock.isAlive === false) {
        this._logger.info("Terminating connection, id = " + sock.userId);
        if (sock.userId) {
          this._terminateUser(sock.userId);
        }
      }
      else {
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
        let response: RError = {
          type: GameResponseType.ERROR,
          code: err.code,
          message: err.toString()
        };

        this._logger.error(response.message);
        this._sendResponse(ws, response);
      }
    }
    catch (err) {
      this._logger.error("Error! " + err);
    }
  }

  private async _chooseAvailableGame(): Promise<Game> {
    const games: Game[] = Array.from(this._games);

    this._logger.info("Number of games: " + games.length);

    for (let game of games) {
      this._logger.info("game.numPlayers = " + game.numPlayers);

      if (game.numPlayers < MAX_PLAYERS_PER_GAME) {
        return game;
      }
    }

    const game = new Game(this._config, this._logger, this._pinata);
    this._games.add(game);

    return game;
  }

  private async _handleLogIn(sock: ExtWebSocket, data: LogInAction) {
    this._logger.info("Handling log in");

    let pinataId: string = "";
    let pinataToken: string = "";

    try {
      const auth = await this._pinata.logIn(data.email, data.password);
      pinataId = auth.accountId;
      pinataToken = auth.token;

      this._logger.info(`Logged into pinata account ${pinataId} with token ` +
                        `${pinataToken}`);
    }
    catch (err) {
      throw new GameError("Couldn't log into pinata: " + err,
                          ErrorCode.AUTHENTICATION_FAILURE);
    }

    const response: RLoginSuccess = {
      type: GameResponseType.LOGIN_SUCCESS,
      pinataId,
      pinataToken
    };

    this._sendResponse(sock, response);
  }

  private async _handleJoinGame(sock: ExtWebSocket, data: JoinGameAction) {
    this._logger.info("Handling join game");

    let { pinataId, pinataToken } = data;

    const game = await this._chooseAvailableGame();
    const entityId = game.addPlayer(sock, pinataId, pinataToken);

    sock.userId = entityId;

    this._users.set(entityId, {
      playerId: entityId,
      pinataId,
      pinataToken,
      ws: sock,
      game
    });

    sock.on("close", () => {
      if (sock.userId) {
        this._terminateUser(sock.userId);
      }
    });

    const response: RJoinGameSuccess = {
      type: GameResponseType.JOIN_GAME_SUCCESS,
      playerId: entityId
    };

    this._sendResponse(sock, response);
  }

  private _respawnPlayer(playerId: EntityId) {
    const user = this._users.get(playerId);
    if (!user) {
      throw new GameError(`Cannot respawn user; No player with id ${playerId}`);
    }
    user.playerId = user.game.respawnPlayer(playerId,
                                            user.pinataId,
                                            user.pinataToken);
    this._users.delete(playerId);
    this._users.set(user.playerId, user);

    user.ws.userId = user.playerId;

    const newIdMsg: RNewPlayerId = {
      type: GameResponseType.NEW_PLAYER_ID,
      playerId: user.playerId
    };
    this._sendResponse(user.ws, newIdMsg);
  }

  // When a message comes in from the client, pass it on to the game instance
  private async _handleClientMessage(sock: ExtWebSocket,
                                     msg: string) {
    const action = deserialiseMessage(msg);

    if (action.type === ActionType.LOG_IN) {
      const data = <LogInAction>action;
      await this._handleLogIn(sock, data);
    }
    else if (action.type == ActionType.JOIN_GAME) {
      const data = <JoinGameAction>action;
      await this._handleJoinGame(sock, data);
    }
    else {
      if (!sock.userId) {
        throw new GameError("User not logged in", ErrorCode.NOT_AUTHORISED);
      }

      const client = this._users.get(sock.userId);
      if (!client) {
        throw new GameError("No such client", ErrorCode.INTERNAL_ERROR);
      }
      action.playerId = sock.userId;

      if (action.type === ActionType.RESPAWN) {
        const ac = <RespawnAction>action;
        this._respawnPlayer(ac.playerId);
      }
      else {
        client.game.onPlayerAction(action);
      }
    }
  }
}
