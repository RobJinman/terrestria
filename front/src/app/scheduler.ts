export type ScheduledFn = () => void;
export type Predicate = () => boolean;
export type ScheduledFnHandle = number;

interface FunctionData {
  fn: ScheduledFn;
  delayMs: number;
  due: number;
  repeatWhile?: Predicate;
}

export class Scheduler {
  private _nextId: ScheduledFnHandle = 0;
  private _functions: Map<ScheduledFnHandle, FunctionData>;

  constructor() {
    this._functions = new Map<ScheduledFnHandle, FunctionData>();
  }

  update() {
    const toRemove: ScheduledFnHandle[] = [];
    const now = (new Date()).getTime();

    this._functions.forEach((fnData, id) => {
      if (now >= fnData.due) {
        const pass = fnData.repeatWhile && fnData.repeatWhile();

        if (!fnData.repeatWhile || pass) {
          fnData.fn();
          fnData.due = now + fnData.delayMs;
        }

        if (!pass) {
          toRemove.push(id);
        }
      }
    });

    toRemove.forEach(id => this._functions.delete(id));
  }

  addFunction(fn: ScheduledFn,
              msFromNow: number,
              repeatWhile?: Predicate): ScheduledFnHandle {
    const id = this._nextId++;
    const now = (new Date()).getTime();

    this._functions.set(id, {
      fn,
      delayMs: msFromNow,
      due: now + msFromNow,
      repeatWhile
    });

    return id;
  }

  removeFunction(handle: ScheduledFnHandle) {
    this._functions.delete(handle);
  }
}
