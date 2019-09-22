import { GameError, ErrorCode } from "./error";
import { EntityId } from "./entity_manager";

export enum ActionType {
  LOG_IN = "LOG_IN",
  MOVE = "MOVE",
  JUMP = "JUMP",
  // ...
}

const VALIDATORS: ValidatorFnMap = {
  LOG_IN: isLogInAction,
  MOVE: isMoveAction,
  JUMP: isJumpAction,
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
  return obj.email &&
         obj.password;
}

// =======================================================
// MoveAction
//
export enum Direction {
  UP = "UP",
  RIGHT = "RIGHT",
  DOWN = "DOWN",
  LEFT = "LEFT"
}

export interface MoveAction extends PlayerAction {
  direction: Direction;
}

export function isMoveAction(obj: any): obj is MoveAction {
  return obj.direction &&
         obj.direction in Direction;
}

// =======================================================
// JumpAction
//
export interface JumpAction extends PlayerAction {
  // TODO
}

export function isJumpAction(obj: any): obj is JumpAction {
  return true; // TODO
}

// =======================================================

export interface PlayerAction {
  type: ActionType;
  playerId: EntityId;
}

type ValidatorFn = (obj: any) => boolean;

type ValidatorFnMap = { [ actionType in ActionType ]: ValidatorFn; };

export function deserialiseMessage(msg: string): PlayerAction {
  let action: PlayerAction;
  try {
    action = <PlayerAction>JSON.parse(msg);
  }
  catch (err) {
    throw new GameError("Malformed request: " + err,
                        ErrorCode.BAD_REQUEST);
  }

  if (!action.type) {
    throw new GameError("Malformed request: Missing type property",
                        ErrorCode.BAD_REQUEST);
  }

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