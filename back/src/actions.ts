import { GameError, ErrorCode } from "./error";

export enum ActionType {
  LOG_IN = "LOG_IN",
  MOVE = "MOVE",
  JUMP = "JUMP",
  // ...
}

const VALIDATORS: ValidatorFnMap = {
  LOG_IN: isLogInPayload,
  MOVE: isMovePayload,
  JUMP: isJumpPayload,
  // ...
};

// =======================================================
// LogInPayload
//
export type LogInPayload = {
  email: string;
  password: string;
}

export function isLogInPayload(obj: any): obj is LogInPayload {
  return obj.email &&
         obj.password;
}

// =======================================================
// MovePayload
//
export enum Direction {
  UP,
  RIGHT,
  DOWN,
  LEFT
}

export interface MovePayload {
  direction: Direction;
}

export function isMovePayload(obj: any): obj is MovePayload {
  return obj.direction && obj.direction in Direction;
}

// =======================================================
// JumpPayload
//
export interface JumpPayload {
  // TODO
}

export function isJumpPayload(obj: any): obj is JumpPayload {
  return true; // TODO
}

// =======================================================

export interface PlayerAction {
  type?: ActionType;
  data?: any;
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

  if (!validator(action.data)) {
    throw new GameError(`Object is not valid ${action.type}`,
                        ErrorCode.BAD_REQUEST);
  }

  return action;
}