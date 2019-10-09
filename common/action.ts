import { GameError, ErrorCode } from "./error";
import { EntityId, ComponentPacket } from "./system";
import { Direction } from "./definitions";

export enum ActionType {
  LOG_IN = "LOG_IN",
  MOVE = "MOVE",
  JUMP = "JUMP",
  REQ_STATE_UPDATE = "REQ_STATE_UPDATE"
  // ...
}

const VALIDATORS: ValidatorFnMap = {
  LOG_IN: isLogInAction,
  MOVE: isMoveAction,
  JUMP: isJumpAction,
  REQ_STATE_UPDATE: isReqStateUpdateAction
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
// ReqStateUpdateAction
//
export interface ReqStateUpdateAction extends PlayerAction {
  components: ComponentPacket[]
}

export function isReqStateUpdateAction(obj: any): obj is ReqStateUpdateAction {
  return obj.components instanceof Array;
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