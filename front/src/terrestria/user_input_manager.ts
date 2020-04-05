import { UserInput } from "./common/action";
import { EntityType } from "./common/game_objects";
import { CSprite, StaticImage, RenderOptions,
         RenderSystem, 
         CShape,
         Colour} from "./render_system";
import { EntityManager, getNextEntityId } from "./entity_manager";
import { EntityId } from "./common/system";
import { CBehaviour, EventHandlerFn } from "./common/behaviour_system";
import { GameEventType } from "./common/event";
import { ComponentType } from "./common/component_types";
import { Scheduler } from "./common/scheduler";
import { UI_Z_INDEX } from "./constants";
import { Rectangle } from "./common/geometry";

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
  private _entityId: EntityId;
  private _onDirectionPressHandler: DirectionInputHandlerFn;
  private _onDirectionReleaseHandler: DirectionInputHandlerFn;
  private _onEnterHandler: VoidInputHandlerFn;
  private _onSettingsHandler: VoidInputHandlerFn;
  private _arrowButtons: Record<UserInput, EntityId>;
  private _fullscreenButton: EntityId;
  private _settingsButton: EntityId;
  private _respawnPrompt: EntityId;
  private _respawnPromptVisible: boolean = false;
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

    window.addEventListener("keydown", this._onKeyDownFn, false);
    window.addEventListener("keyup", this._onKeyUpFn, false);

    this._onDirectionPressHandler = onDirectionPressHandler;
    this._onDirectionReleaseHandler = onDirectionReleaseHandler;
    this._onEnterHandler = onEnterHandler;
    this._onSettingsHandler = onSettingsHandler;

    this._entityId = getNextEntityId();

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

    this._arrowButtons = {
      UP: btnUp,
      RIGHT: btnRight,
      DOWN: btnDown,
      LEFT: btnLeft
    };

    this._settingsButton =
      this._constructButton("button_settings",
                            () => this._onSettingsButtonPress(),
                            () => this._onSettingsButtonRelease());


    this._fullscreenButton =
      this._constructButton("button_fullscreen",
                            () => this._onFullscreenButtonPress(),
                            () => this._onFullscreenButtonRelease());

    this._respawnPrompt = this._constructRespawnPrompt(() => this._onRespawn());

    this._updateComponentsVisibility();
  }

  setMobileControlsVisible(visible: boolean) {
    this._mobileControlsVisible = visible;
    this._updateComponentsVisibility();
  }

  get mobileControlsVisible() {
    return this._mobileControlsVisible;
  }

  showRespawnPrompt() {
    this._respawnPromptVisible = true;
    this._updateComponentsVisibility();
  }

  hideRespawnPrompt() {
    this._respawnPromptVisible = false;
    this._updateComponentsVisibility();
  }

  private _fullscreenSupported(): boolean {
    return document.fullscreenEnabled;
  }

  private _constructRespawnPrompt(onPress: () => void) {
    const id = getNextEntityId();

    const renderOpts: RenderOptions = {
      zIndex: UI_Z_INDEX + 1,
      screenPosition: { x: 0, y: 0 },
      onPress
    };

    const shape = new Rectangle(1, 1); // Will get resized
    const colour = new Colour(0, 0, 0, 0.2);

    const renderComp = new CShape(id, shape, colour, renderOpts);

    this._em.addEntity(id, EntityType.OTHER, [ renderComp ]);

    return id;
  }

  private _onRespawn() {
    this._onEnterHandler();
  }

  private _updateComponentsVisibility() {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);

    const arrowsVisible = this._mobileControlsVisible;
    const fullscreenVisible = this._fullscreenSupported() &&
                              !this._fullscreen();
    const settingsVisible = true;
    const respawnPromptVisible = this._respawnPromptVisible;

    renderSys.setVisible(this._arrowButtons.UP, arrowsVisible);
    renderSys.setVisible(this._arrowButtons.RIGHT, arrowsVisible);
    renderSys.setVisible(this._arrowButtons.DOWN, arrowsVisible);
    renderSys.setVisible(this._arrowButtons.LEFT, arrowsVisible);

    renderSys.setVisible(this._fullscreenButton, fullscreenVisible);

    renderSys.setVisible(this._settingsButton, settingsVisible);

    renderSys.setVisible(this._respawnPrompt, respawnPromptVisible);

    this._positionComponents();
  }

  private _fullscreen(): boolean {
    const windowArea = window.innerWidth * window.innerHeight;
    const screenArea = screen.width * screen.height;
    const hasFullscreenElement = document.fullscreenElement ? true : false;

    return hasFullscreenElement || windowArea == screenArea;
  }

  private _onWindowResized() {
    this._updateComponentsVisibility();
  }

  private _positionComponents() {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);

    this._positionArrowButtons(renderSys);
    this._positionSettingsButton(renderSys);
    this._positionFullscreenButton(renderSys);
    this._positionRespawnPrompt(renderSys);
  }

  private _positionRespawnPrompt(renderSys: RenderSystem) {
    const w = 0.5 * renderSys.viewH;
    const h = 0.5 * renderSys.viewH;
    const x = (renderSys.viewW - w) * 0.5;
    const y = (renderSys.viewH - h) * 0.5;

    const shape = new Rectangle(w, h);

    renderSys.assignNewShape(this._respawnPrompt, shape);
    renderSys.setScreenPosition(this._respawnPrompt, x, y);
  }

  private _positionArrowButtons(renderSys: RenderSystem) {
    const upArrow = this._arrowButtons[UserInput.UP];
    const rightArrow = this._arrowButtons[UserInput.RIGHT];
    const downArrow = this._arrowButtons[UserInput.DOWN];
    const leftArrow = this._arrowButtons[UserInput.LEFT];

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

  private _positionFullscreenButton(renderSys: RenderSystem) {
    const w = 0.25 * renderSys.viewH;
    const h = 0.09 * renderSys.viewH;
    const margin = 0.02 * renderSys.viewH;
    renderSys.setSpriteSize(this._fullscreenButton, w, h);
    renderSys.setScreenPosition(this._fullscreenButton, margin, margin);
  }

  private _positionSettingsButton(renderSys: RenderSystem) {
    const w = 0.13 * renderSys.viewH;
    const h = 0.13 * renderSys.viewH;
    const margin = 0.02 * renderSys.viewH;
    const x = renderSys.viewW - margin - w;
    const y = margin;
    renderSys.setSpriteSize(this._settingsButton, w, h);
    renderSys.setScreenPosition(this._settingsButton, x, y);
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

  private _onArrowPressed(input: UserInput) {
    this._onDirectionPressHandler(input);
    const id = this._arrowButtons[input];
    const inputName = this._inputName(input);
    this._setButtonActive(id, inputName);
  }

  private _onArrowReleased(input: UserInput) {
    this._onDirectionReleaseHandler(input);
    const id = this._arrowButtons[input];
    const inputName = this._inputName(input);
    this._setButtonInactive(id, inputName);
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
