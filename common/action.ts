import { GameError, ErrorCode } from "./error";
import { EntityId } from "./system";

export enum UserInput {
  UP = "UP",
  RIGHT = "RIGHT",
  DOWN = "DOWN",
  LEFT = "LEFT"
}

export enum InputState {
  PRESSED = "PRESSED",
  RELEASED = "RELEASED"
}

export enum ActionType {
  LOG_IN = "LOG_IN",
  SIGN_UP = "SIGN_UP",
  JOIN_GAME = "JOIN_GAME",
  RESPAWN = "RESPAWN",
  USER_INPUT = "USER_INPUT"
  // ...
}

const VALIDATORS: ValidatorFnMap = {
  LOG_IN: isLogInAction,
  SIGN_UP: isSignUpAction,
  JOIN_GAME: isJoinGameAction,
  RESPAWN: isRespawnAction,
  USER_INPUT: isUserInputAction
  // ...
};

// =======================================================
// LogInAction
//
export interface LogInAction extends PlayerAction {
  identity: string;
  password: string;
}

export function isLogInAction(obj: any): obj is LogInAction {
  return obj.type == ActionType.LOG_IN &&
         obj.identity &&
         obj.password;
}

// =======================================================
// SignUpAction
//
export interface SignUpAction extends PlayerAction {
  email: string;
  username: string;
  password: string;
}

export function isSignUpAction(obj: any): obj is SignUpAction {
  return obj.type == ActionType.SIGN_UP &&
         obj.email &&
         obj.username &&
         obj.password;
}

// =======================================================
// JoinGameAction
//
export interface JoinGameAction extends PlayerAction {
  pinataId?: string;
  pinataToken?: string;
}

export function isJoinGameAction(obj: any): obj is JoinGameAction {
  return obj.type === ActionType.JOIN_GAME;
}

// =======================================================
// RespawnAction
//
export interface RespawnAction extends PlayerAction {}

export function isRespawnAction(obj: any): obj is RespawnAction {
  return obj.type === ActionType.RESPAWN;
}

// =======================================================
// UserInputAction
//
export interface UserInputAction extends PlayerAction {
  input: UserInput;
  state: InputState;
}

export function isUserInputAction(obj: any): obj is UserInputAction {
  return obj.type === ActionType.USER_INPUT &&
         obj.input &&
         obj.input in UserInput &&
         obj.state &&
         obj.state in InputState;
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
    throw new GameError(`Malformed message: Missing ${prop} property`,
                        ErrorCode.BAD_MESSAGE);
  }
}

export function deserialiseMessage(msg: string): PlayerAction {
  let action: PlayerAction;
  try {
    action = <PlayerAction>JSON.parse(msg);
  }
  catch (err) {
    throw new GameError("Malformed message: " + err,
                        ErrorCode.BAD_MESSAGE);
  }

  assertHasProperty(action, "type");

  const validator = VALIDATORS[action.type];
  if (!validator) {
    throw new GameError(`Unrecognised type '${action.type}'`,
                        ErrorCode.BAD_MESSAGE);
  }

  if (!validator(action)) {
    throw new GameError(`Object is not valid ${action.type}`,
                        ErrorCode.BAD_MESSAGE);
  }

  return action;
}
