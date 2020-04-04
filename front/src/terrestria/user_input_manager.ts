import { UserInput } from "./common/action";
import { EntityType } from "./common/game_objects";
import { CSprite, StaticImage, RenderOptions,
         RenderSystem } from "./render_system";
import { EntityManager, getNextEntityId } from "./entity_manager";
import { EntityId } from "./common/system";
import { CBehaviour, EventHandlerFn } from "./common/behaviour_system";
import { GameEventType } from "./common/event";
import { ComponentType } from "./common/component_types";
import { Scheduler } from "./common/scheduler";
import { UI_Z_INDEX } from "./constants";

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
  private _em: EntityManager;
  private _scheduler: Scheduler;
  private _entityId?: EntityId;
  private _onDirectionPressHandler: DirectionInputHandlerFn;
  private _onDirectionReleaseHandler: DirectionInputHandlerFn;
  private _onEnterHandler: VoidInputHandlerFn;
  private _onSettingsHandler: VoidInputHandlerFn;
  private _arrowButtons = new Map<UserInput, EntityId>();
  private _fullscreenButton?: EntityId;
  //private _soundButton?: EntityId;
  private _settingsButton?: EntityId;
  private _mobileControlsVisible: boolean = true;

  private _onKeyDownFn = this._onKeyDown.bind(this);
  private _onKeyUpFn = this._onKeyUp.bind(this);

  constructor(em: EntityManager,
              scheduler: Scheduler,
              onDirectionPressHandler: DirectionInputHandlerFn,
              onDirectionReleaseHandler: DirectionInputHandlerFn,
              onEnterHandler: VoidInputHandlerFn,
              onSettingsHandler: VoidInputHandlerFn) {
    this._em = em;
    this._scheduler = scheduler;

    this._onDirectionPressHandler = onDirectionPressHandler;
    this._onDirectionReleaseHandler = onDirectionReleaseHandler;
    this._onEnterHandler = onEnterHandler;
    this._onSettingsHandler = onSettingsHandler;
  }

  destroy() {
    if (this._entityId) {
      this._em.removeEntity(this._entityId);
      this._entityId = undefined;
    }
    if (this._fullscreenButton) {
      this._em.removeEntity(this._fullscreenButton);
      this._fullscreenButton = undefined;
    }
    if (this._settingsButton) {
      this._em.removeEntity(this._settingsButton);
      this._settingsButton = undefined;
    }

    this._arrowButtons.forEach(id => this._em.removeEntity(id));
    this._arrowButtons.clear();

    window.removeEventListener("keydown", this._onKeyDownFn);
    window.removeEventListener("keyup", this._onKeyUpFn);
  }

  initialise() {
    this._entityId = getNextEntityId();

    window.addEventListener("keydown", this._onKeyDownFn, false);
    window.addEventListener("keyup", this._onKeyUpFn, false);

    const targetedHandlers = new Map<GameEventType, EventHandlerFn>();
    const broadcastHandlers = new Map<GameEventType, EventHandlerFn>();
    broadcastHandlers.set(GameEventType.WINDOW_RESIZED,
                          this._onWindowResized.bind(this));
    const behaviourComp = new CBehaviour(this._entityId,
                                         targetedHandlers,
                                         broadcastHandlers);
    this._em.addEntity(this._entityId, EntityType.OTHER, [ behaviourComp ]);

    const btnUp =
      this._constructButton("button_up",
                            () => this._onArrowPressed(UserInput.UP),
                            () => this._onArrowReleased(UserInput.UP));

    const btnRight =
      this._constructButton("button_right",
                            () => this._onArrowPressed(UserInput.RIGHT),
                            () => this._onArrowReleased(UserInput.RIGHT));

    const btnDown =
      this._constructButton("button_down",
                            () => this._onArrowPressed(UserInput.DOWN),
                            () => this._onArrowReleased(UserInput.DOWN));

    const btnLeft =
      this._constructButton("button_left",
                            () => this._onArrowPressed(UserInput.LEFT),
                            () => this._onArrowReleased(UserInput.LEFT));

    this._arrowButtons.set(UserInput.UP, btnUp);
    this._arrowButtons.set(UserInput.RIGHT, btnRight);
    this._arrowButtons.set(UserInput.DOWN, btnDown);
    this._arrowButtons.set(UserInput.LEFT, btnLeft);

    this._settingsButton =
      this._constructButton("button_settings",
                            () => this._onSettingsButtonPress(),
                            () => this._onSettingsButtonRelease());
/*
    this._soundButton =
      this._constructButton("sound_button",
                            () => this._onSoundButtonPress,
                            () => this._onSoundButtonRelease());
*/
    if (!this._fullscreen()) {
      this._constructFullscreenButton();
    }
    this._positionButtons();

    this.setMobileControlsVisible(this._mobileControlsVisible);
  }

  setMobileControlsVisible(visible: boolean) {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);

    this._arrowButtons.forEach(btn => {
      renderSys.setVisible(btn, visible);
    });

    this._mobileControlsVisible = visible;
  }

  get mobileControlsVisible() {
    return this._mobileControlsVisible;
  }

  private _fullscreenSupported(): boolean {
    return document.fullscreenEnabled;
  }

  private _fullscreen(): boolean {
    const windowArea = window.innerWidth * window.innerHeight;
    const screenArea = screen.width * screen.height;
    const hasFullscreenElement = document.fullscreenElement ? true : false;

    return hasFullscreenElement || windowArea == screenArea;
  }

  private _constructFullscreenButton() {
    if (!this._fullscreenButton && this._fullscreenSupported()) {
      this._fullscreenButton =
        this._constructButton("button_fullscreen",
                              () => this._onFullscreenButtonPress(),
                              () => this._onFullscreenButtonRelease());
    }
  }

  private _onWindowResized() {
    if (!this._fullscreen()) {
      this._constructFullscreenButton();
    }
    else {
      this._removeFullscreenButton();
    }

    this._positionButtons();
  }

  private _positionButtons() {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);

    const upArrow = this._arrowButtons.get(UserInput.UP);
    const rightArrow = this._arrowButtons.get(UserInput.RIGHT);
    const downArrow = this._arrowButtons.get(UserInput.DOWN);
    const leftArrow = this._arrowButtons.get(UserInput.LEFT);

    if (upArrow && rightArrow && downArrow && leftArrow) {
      const sz = 0.15; // As percentage of view height

      const margin = renderSys.viewH * 0.02;
      const w = renderSys.viewH * sz;
      const h = renderSys.viewH * sz;
      const x1 = 0 * w + margin;
      const x2 = 1 * w + margin;
      const x3 = 2 * w + margin;
      const y1 = renderSys.viewH - 3 * h - margin;
      const y2 = renderSys.viewH - 2 * h - margin;
      const y3 = renderSys.viewH - 1 * h - margin;

      renderSys.setSpriteSize(upArrow, w, h);
      renderSys.setSpriteSize(rightArrow, w, h);
      renderSys.setSpriteSize(downArrow, w, h);
      renderSys.setSpriteSize(leftArrow, w, h);

      renderSys.setScreenPosition(upArrow, x2, y1);
      renderSys.setScreenPosition(rightArrow, x3, y2);
      renderSys.setScreenPosition(downArrow, x2, y3);
      renderSys.setScreenPosition(leftArrow, x1, y2);
    }
    if (this._fullscreenButton) {
      const w = 0.25 * renderSys.viewH;
      const h = 0.09 * renderSys.viewH;
      const margin = 0.02 * renderSys.viewH;
      renderSys.setSpriteSize(this._fullscreenButton, w, h);
      renderSys.setScreenPosition(this._fullscreenButton, margin, margin);
    }
    if (this._settingsButton) {
      const w = 0.13 * renderSys.viewH;
      const h = 0.13 * renderSys.viewH;
      const margin = 0.02 * renderSys.viewH;
      const x = renderSys.viewW - margin - w;
      const y = margin;
      renderSys.setSpriteSize(this._settingsButton, w, h);
      renderSys.setScreenPosition(this._settingsButton, x, y);
    }
  }

  private _onKeyDown(event: KeyboardEvent) {
    const input = keyEventToUserInput(event);

    if (input !== null) {
      this._onDirectionPressHandler(input);
    }
    else if (event.key == "Enter") {
      this._onEnterHandler();
    }
  }

  private _onKeyUp(event: KeyboardEvent) {
    const input = keyEventToUserInput(event);

    if (input !== null) {
      this._onDirectionReleaseHandler(input);
    }
  }

  private _enterFullscreen() {
    document.documentElement.requestFullscreen();
  }

  private _removeFullscreenButton() {
    if (this._fullscreenButton) {
      this._em.removeEntity(this._fullscreenButton);
      this._fullscreenButton = undefined;
    }
  }

  private _onArrowPressed(input: UserInput) {
    this._onDirectionPressHandler(input);
    const id = this._arrowButtons.get(input);
    const inputName = this._inputName(input);
    id && this._setButtonActive(id, inputName);
  }

  private _onArrowReleased(input: UserInput) {
    this._onDirectionReleaseHandler(input);
    const id = this._arrowButtons.get(input);
    const inputName = this._inputName(input);
    id && this._setButtonInactive(id, inputName);
  }

  private _onFullscreenButtonPress() {
    if (this._fullscreenButton) {
      this._setButtonActive(this._fullscreenButton, "button_fullscreen");
    }
  }

  private _onFullscreenButtonRelease() {
    if (this._fullscreenButton) {
      this._setButtonInactive(this._fullscreenButton, "button_fullscreen");
    }
    this._enterFullscreen();
  }

  private _onSettingsButtonPress() {
    if (this._settingsButton) {
      this._setButtonActive(this._settingsButton, "button_settings");
    }
  }

  private _onSettingsButtonRelease() {
    if (this._settingsButton) {
      this._setButtonInactive(this._settingsButton, "button_settings");
    }
    this._onSettingsHandler();
  }

  private _inputName(input: UserInput): string {
    switch (input) {
      case UserInput.UP: return "button_up";
      case UserInput.RIGHT: return "button_right";
      case UserInput.DOWN: return "button_down";
      case UserInput.LEFT: return "button_left";
    }
  }

  private _setButtonActive(id: EntityId, buttonName: string) {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    this._scheduler.addFunction(() => {
      renderSys.setCurrentImage(id, `${buttonName}_active.png`);
    }, 0);
  }

  private _setButtonInactive(id: EntityId, buttonName: string) {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    this._scheduler.addFunction(() => {
      renderSys.setCurrentImage(id, `${buttonName}.png`);
    }, 0);
  }

  private _constructButton(buttonName: string,
                           onPress: () => void,
                           onRelease: () => void) {
    const id = getNextEntityId();

    const staticImages: StaticImage[] = [
      {
        name: `${buttonName}.png`
      },
      {
        name: `${buttonName}_active.png`
      }
    ];

    const renderOpts: RenderOptions = {
      zIndex: UI_Z_INDEX,
      screenPosition: { x: 0, y: 0 },
      onPress,
      onRelease
    };

    const renderComp = new CSprite(id,
                                   staticImages,
                                   [],
                                   `${buttonName}.png`,
                                   renderOpts);

    this._em.addEntity(id, EntityType.OTHER, [ renderComp ]);

    return id;
  }
}
