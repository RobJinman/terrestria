import { GameError, ErrorCode } from "./error";
import { EntityId } from "./system";
import { Direction } from "./definitions";

export enum ActionType {
  LOG_IN = "LOG_IN",
  RESPAWN = "RESPAWN",
  MOVE = "MOVE"
  // ...
}

const VALIDATORS: ValidatorFnMap = {
  LOG_IN: isLogInAction,
  RESPAWN: isRespawnAction,
  MOVE: isMoveAction
  // ...
};

// =======================================================
// LogInAction
//
export interface LogInAction extends PlayerAction {
  email: string;
  password: string;
}

export function isLogInAction(obj: any): obj is LogInAction {
  return obj.type == ActionType.LOG_IN &&
         obj.email &&
         obj.password;
}

// =======================================================
// RespawnAction
//
export interface RespawnAction extends PlayerAction {}

export function isRespawnAction(obj: any): obj is RespawnAction {
  return obj.type === ActionType.RESPAWN;
}

// =======================================================
// MoveAction
//
export interface MoveAction extends PlayerAction {
  direction: Direction;
}

export function isMoveAction(obj: any): obj is MoveAction {
  return obj.type === ActionType.MOVE &&
         obj.direction &&
         obj.direction in Direction;
}

// =======================================================

export interface PlayerAction {
  type: ActionType;
  playerId: EntityId;
}

type ValidatorFn = (obj: any) => boolean;

type ValidatorFnMap = { [ actionType in ActionType ]: ValidatorFn; };

function assertHasProperty(obj: any, prop: string) {
  if (!obj.hasOwnProperty(prop)) {
    throw new GameError(`Malformed request: Missing ${prop} property`,
                        ErrorCode.BAD_REQUEST);
  }
}

export function deserialiseMessage(msg: string): PlayerAction {
  let action: PlayerAction;
  try {
    action = <PlayerAction>JSON.parse(msg);
  }
  catch (err) {
    throw new GameError("Malformed request: " + err,
                        ErrorCode.BAD_REQUEST);
  }

  assertHasProperty(action, "type");

  const validator = VALIDATORS[action.type];
  if (!validator) {
    throw new GameError(`Unrecognised type '${action.type}'`,
                        ErrorCode.BAD_REQUEST);
  }

  if (!validator(action)) {
    throw new GameError(`Object is not valid ${action.type}`,
                        ErrorCode.BAD_REQUEST);
  }

  return action;
}
