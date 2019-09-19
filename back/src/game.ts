import { GameError, ErrorCode } from "./error";
import { ActionType, PlayerAction } from "./action";

const WORLD_W = 100;
const WORLD_H = 100;

type EntityId = number;

enum EntityType {
  PLAYER,
  SOIL,
  ROCK,
  GEM
}

class Entity {
  private static _nextId: EntityId = 0;

  private _type: EntityType;
  private _id: number;

  constructor(type: EntityType) {
    this._type = type;
    this._id = Entity._nextId++;
  }

  get type() {
    return this._type;
  }

  get id() {
    return this._id;
  }
}

class Player extends Entity {
  private _playerId: string;
  private _pinataToken: string;

  constructor(playerId: string, pinataToken: string) {
    super(EntityType.PLAYER);

    this._playerId = playerId;
    this._pinataToken = pinataToken;
  }

  get playerId() {
    return this._playerId;
  }

  get token() {
    return this._pinataToken;
  }
}

class World {
  private _grid: Set<EntityId>[][];

  // =======================================================
  // constructor
  // =======================================================
  constructor(w: number, h: number) {
    this._grid = new Array(w);
    for (let c = 0; c < w; ++c) {
      this._grid[c] = [];
      for (let r = 0; r < h; ++r) {
        this._grid[c][r] = new Set<EntityId>();
      }
    }
  }
}

export class Game {
  private static nextGameId: number = 0;

  private _id: number;
  private _players: Map<string, Player>;
  private _entities: Set<Entity>;
  private _world: World;

  // =======================================================
  // constructor
  // =======================================================
  constructor() {
    this._id = Game.nextGameId++;
    this._players = new Map<string, Player>();
    this._entities = new Set<Entity>();
    this._world = new World(WORLD_W, WORLD_H);

    console.log(`Starting game ${this._id}`);
  }

  // =======================================================
  // addPlayer
  // =======================================================
  addPlayer(id: string, token: string) {
    console.log(`Adding player ${id}`);
    this._players.set(id, new Player(id, token));
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
