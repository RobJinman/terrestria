export enum ErrorCode {
  UNKNOWN = "UNKNOWN",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  LOG_IN_FAILURE = "LOG_IN_FAILURE",
  SIGN_UP_FAILURE = "SIGN_UP_FAILURE",
  BAD_MESSAGE = "BAD_MESSAGE"
};

export class GameError extends Error {
  public code: ErrorCode = ErrorCode.UNKNOWN

  constructor(msg: string, code?: ErrorCode) {
    super(msg);
    Object.setPrototypeOf(this, GameError.prototype);

    if (code) {
      this.code = code;
    }
  }

  toString() {
    return `GameError, code ${this.code}: ${super.toString()}`;
  }
}
