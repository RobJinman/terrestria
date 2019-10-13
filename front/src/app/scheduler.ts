export type ScheduledFn = () => void;
export type Predicate = () => boolean;
export type ScheduledFnHandle = number;

interface FunctionData {
  id: ScheduledFnHandle;
  fn: ScheduledFn;
  delayMs: number;
  due: number;
  repeatWhile?: Predicate;
}

export class Scheduler {
  private _nextId: ScheduledFnHandle = 0;
  private _functions: Map<ScheduledFnHandle, FunctionData>;
  private _pendingAdd: FunctionData[] = [];
  private _pendingDelete: ScheduledFnHandle[] = [];

  constructor() {
    this._functions = new Map<ScheduledFnHandle, FunctionData>();
  }

  update() {
    this._pendingAdd.forEach(data => {
      this._addFunction(data.id,
                        data.fn,
                        data.delayMs,
                        data.due,
                        data.repeatWhile);
    });
    this._pendingAdd = [];

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
    this._pendingDelete.forEach(id => this._functions.delete(id));
    this._pendingDelete = [];
  }

  private _addFunction(id: ScheduledFnHandle,
                       fn: ScheduledFn,
                       delayMs: number,
                       due: number,
                       repeatWhile?: Predicate) {
    this._functions.set(id, {
      id,
      fn,
      delayMs,
      due,
      repeatWhile
    });
  }

  addFunction(fn: ScheduledFn,
              msFromNow: number,
              repeatWhile?: Predicate): ScheduledFnHandle {
    const id = this._nextId++;
    const now = (new Date()).getTime();

    this._pendingAdd.push({
      id,
      fn,
      delayMs: msFromNow,
      due: now + msFromNow,
      repeatWhile
    });

    return id;
  }

  removeFunction(handle: ScheduledFnHandle) {
    this._pendingDelete.push(handle);
  }
}
