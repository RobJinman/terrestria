export enum ErrorCode {
  UNKNOWN = "UNKNOWN",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
  NOT_AUTHORISED = "NOT_AUTHORISED",
  AUTHENTICATION_FAILURE = "AUTHENTICATION_FAILURE",
  BAD_REQUEST = "BAD_REQUEST",
  INTERNAL_ERROR = "INTERNAL_ERROR"
};

export class GameError extends Error {
  public code: ErrorCode = ErrorCode.UNKNOWN

  // =======================================================
  // constructor
  // =======================================================
  constructor(msg: string, code?: ErrorCode) {
    super(msg);
    Object.setPrototypeOf(this, GameError.prototype);

    if (code) {
      this.code = code;
    }
  }

  // =======================================================
  // toString
  // =======================================================
  toString() {
    return `GameError, code ${this.code}: ${super.toString()}`;
  }
}
