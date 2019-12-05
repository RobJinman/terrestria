import { UserInput } from "./common/action";

export type DirectionInputHandlerFn = (input: UserInput) => void;
export type VoidInputHandlerFn = () => void;

function keyEventToUserInput(event: KeyboardEvent): UserInput|null {
  switch (event.key) {
    case "ArrowUp": return UserInput.UP;
    case "ArrowRight": return UserInput.RIGHT;
    case "ArrowDown": return UserInput.DOWN;
    case "ArrowLeft": return UserInput.LEFT;
  }
  return null;
}

export class UserInputManager {
  private _onDirectionPressHandler: DirectionInputHandlerFn|null = null;
  private _onDirectionReleaseHandler: DirectionInputHandlerFn|null = null;
  private _onEnterHandler: VoidInputHandlerFn|null = null;

  constructor() {
    this._constructUi();

    window.addEventListener("keydown", event => this._onKeyDown(event), false);
    window.addEventListener("keyup", event => this._onKeyUp(event), false);
  }

  set onDirectionPressHandler(handler: DirectionInputHandlerFn) {
    this._onDirectionPressHandler = handler;
  }

  set onDirectionReleaseHandler(handler: DirectionInputHandlerFn) {
    this._onDirectionReleaseHandler = handler;
  }

  set onEnterHandler(handler: VoidInputHandlerFn) {
    this._onEnterHandler = handler;
  }

  private _constructUi() {
    // TODO: Construct entities
  }

  private _onKeyDown(event: KeyboardEvent) {
    const input = keyEventToUserInput(event);

    if (input !== null && this._onDirectionPressHandler) {
      this._onDirectionPressHandler(input);
    }
    else if (event.key == "Enter" && this._onEnterHandler) {
      this._onEnterHandler();
    }
  }

  private _onKeyUp(event: KeyboardEvent) {
    const input = keyEventToUserInput(event);

    if (input !== null && this._onDirectionReleaseHandler) {
      this._onDirectionReleaseHandler(input);
    }
  }
}
