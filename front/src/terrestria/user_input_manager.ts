import { UserInput } from "./common/action";
import { EntityType } from "./common/game_objects";
import { CSprite, StaticImage, RenderOptions, RenderSystem, CShape, Colour,
         CText } from "./render_system";
import { EntityManager, getNextEntityId } from "./entity_manager";
import { EntityId } from "./common/system";
import { CBehaviour, EventHandlerFn } from "./common/behaviour_system";
import { GameEventType } from "./common/event";
import { ComponentType } from "./common/component_types";
import { Scheduler } from "./common/scheduler";
import { UI_Z_INDEX } from "./constants";
import { RoundedRectangle } from "./common/geometry";
import { GameError } from "./common/error";

const BUTTON_OPACITY_INACTIVE = 0.5;
const BUTTON_OPACITY_ACTIVE = 1.0;

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
  private _onDirectionPressHandler: DirectionInputHandlerFn;
  private _onDirectionReleaseHandler: DirectionInputHandlerFn;
  private _onEnterHandler: VoidInputHandlerFn;
  private _onSettingsHandler: VoidInputHandlerFn;
  private _ids?: {
    main: EntityId;
    arrowButtons: Record<UserInput, EntityId>;
    fullscreenButton: EntityId;
    settingsButton: EntityId;
    respawnPromptBg: EntityId;
    respawnPromptText: EntityId;
  };
  private _respawnPromptVisible: boolean = false;
  private _mobileControlsVisible: boolean = true;

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

    window.onkeydown = this._onKeyDown.bind(this);
    window.onkeyup = this._onKeyUp.bind(this);
  }

  initialise() {
    this._respawnPromptVisible = false;
    this._mobileControlsVisible = false;

    const mainId = getNextEntityId();

    const targetedHandlers = new Map<GameEventType, EventHandlerFn>();
    const broadcastHandlers = new Map<GameEventType, EventHandlerFn>();
    broadcastHandlers.set(GameEventType.WINDOW_RESIZED,
                          this._onWindowResized.bind(this));
    const behaviourComp = new CBehaviour(mainId,
                                         targetedHandlers,
                                         broadcastHandlers);
    this._em.addEntity(mainId, EntityType.OTHER, [ behaviourComp ]);

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

    const arrowButtons = {
      UP: btnUp,
      RIGHT: btnRight,
      DOWN: btnDown,
      LEFT: btnLeft
    };

    const settingsButton =
      this._constructButton("button_settings",
                            () => this._onSettingsButtonPress(),
                            () => this._onSettingsButtonRelease());


    const fullscreenButton =
      this._constructButton("button_fullscreen",
                            () => this._onFullscreenButtonPress(),
                            () => this._onFullscreenButtonRelease());

    const respawnPromptBg =
      this._constructRespawnPromptBg(() => this._onRespawn());
    const respawnPromptText =
      this._constructRespawnPromptText(() => this._onRespawn());

    this._ids = {
      main: mainId,
      arrowButtons,
      settingsButton,
      fullscreenButton,
      respawnPromptBg,
      respawnPromptText
    };

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

  private _fullscreenSupported(): boolean {
    return document.fullscreenEnabled;
  }

  private _constructRespawnPromptText(onPress: () => void) {
    const id = getNextEntityId();

    const renderOpts: RenderOptions = {
      zIndex: UI_Z_INDEX + 1,
      screenPosition: { x: 1, y: 1 },
      onPress
    };

    const colour = new Colour(1, 1, 1, 1);

    const renderComp = new CText(id,
                                "Tap here to respawn (or press enter)",
                                28,
                                colour,
                                renderOpts);

    this._em.addEntity(id, EntityType.OTHER, [ renderComp ]);

    return id;
  }

  private _constructRespawnPromptBg(onPress: () => void) {
    const id = getNextEntityId();

    const renderOpts: RenderOptions = {
      zIndex: UI_Z_INDEX,
      screenPosition: { x: 0, y: 0 },
      onPress
    };

    const shape = new RoundedRectangle(1, 1, 1); // Will get resized
    const colour = new Colour(0, 0, 0, 0.5);

    const renderComp = new CShape(id,
                                  shape,
                                  colour,
                                  renderOpts);

    this._em.addEntity(id, EntityType.OTHER, [ renderComp ]);

    return id;
  }

  private _onRespawn() {
    this._onEnterHandler();
  }

  private _updateComponentsVisibility() {
    if (!this._ids) {
      throw new GameError("UserInputManager not initialised");
    }

    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);

    const arrowsVisible = this._mobileControlsVisible;
    const fullscreenVisible = this._fullscreenSupported() &&
                              !this._fullscreen();
    const settingsVisible = true;
    const respawnPromptVisible = this._respawnPromptVisible;

    renderSys.setVisible(this._ids.arrowButtons.UP, arrowsVisible);
    renderSys.setVisible(this._ids.arrowButtons.RIGHT, arrowsVisible);
    renderSys.setVisible(this._ids.arrowButtons.DOWN, arrowsVisible);
    renderSys.setVisible(this._ids.arrowButtons.LEFT, arrowsVisible);

    renderSys.setVisible(this._ids.fullscreenButton, fullscreenVisible);

    renderSys.setVisible(this._ids.settingsButton, settingsVisible);

    renderSys.setVisible(this._ids.respawnPromptBg, respawnPromptVisible);
    renderSys.setVisible(this._ids.respawnPromptText, respawnPromptVisible);

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
    if (!this._ids) {
      throw new GameError("UserInputManager not initialised");
    }

    const bgW = 550;
    const bgH = 80;
    const bgX = (renderSys.viewW - bgW) * 0.5;
    const bgY = (renderSys.viewH - bgH) * 0.5;
    const r = 40;

    const shape = new RoundedRectangle(bgW, bgH, r);

    renderSys.assignNewShape(this._ids.respawnPromptBg, shape);
    renderSys.setScreenPosition(this._ids.respawnPromptBg, bgX, bgY);

    const textComp = renderSys.getTextComponent(this._ids.respawnPromptText);

    const textW = textComp.width;
    const textH = textComp.height;

    const textX = (renderSys.viewW - textW) * 0.5;
    const textY = (renderSys.viewH - textH) * 0.5;

    renderSys.setScreenPosition(this._ids.respawnPromptText, textX, textY);
  }

  private _positionArrowButtons(renderSys: RenderSystem) {
    if (!this._ids) {
      throw new GameError("UserInputManager not initialised");
    }

    const upArrow = this._ids.arrowButtons[UserInput.UP];
    const rightArrow = this._ids.arrowButtons[UserInput.RIGHT];
    const downArrow = this._ids.arrowButtons[UserInput.DOWN];
    const leftArrow = this._ids.arrowButtons[UserInput.LEFT];

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
    if (!this._ids) {
      throw new GameError("UserInputManager not initialised");
    }

    const w = 0.25 * renderSys.viewH;
    const h = 0.09 * renderSys.viewH;
    const margin = 0.02 * renderSys.viewH;
    renderSys.setSpriteSize(this._ids.fullscreenButton, w, h);
    renderSys.setScreenPosition(this._ids.fullscreenButton, margin, margin);
  }

  private _positionSettingsButton(renderSys: RenderSystem) {
    if (!this._ids) {
      throw new GameError("UserInputManager not initialised");
    }

    const w = 0.13 * renderSys.viewH;
    const h = 0.13 * renderSys.viewH;
    const margin = 0.02 * renderSys.viewH;
    const x = renderSys.viewW - margin - w;
    const y = margin;
    renderSys.setSpriteSize(this._ids.settingsButton, w, h);
    renderSys.setScreenPosition(this._ids.settingsButton, x, y);
  }

  private _enterFullscreen() {
    document.documentElement.requestFullscreen();
  }

  private _onArrowPressed(input: UserInput) {
    if (!this._ids) {
      throw new GameError("UserInputManager not initialised");
    }

    this._onDirectionPressHandler(input);
    const id = this._ids.arrowButtons[input];
    const inputName = this._inputName(input);
    this._setButtonActive(id, inputName);
  }

  private _onArrowReleased(input: UserInput) {
    if (!this._ids) {
      throw new GameError("UserInputManager not initialised");
    }

    this._onDirectionReleaseHandler(input);
    const id = this._ids.arrowButtons[input];
    const inputName = this._inputName(input);
    this._setButtonInactive(id, inputName);
  }

  private _onFullscreenButtonPress() {
    if (!this._ids) {
      throw new GameError("UserInputManager not initialised");
    }

    if (this._ids.fullscreenButton) {
      this._setButtonActive(this._ids.fullscreenButton, "button_fullscreen");
    }
  }

  private _onFullscreenButtonRelease() {
    if (!this._ids) {
      throw new GameError("UserInputManager not initialised");
    }

    if (this._ids.fullscreenButton) {
      this._setButtonInactive(this._ids.fullscreenButton, "button_fullscreen");
    }
    this._enterFullscreen();
  }

  private _onSettingsButtonPress() {
    if (!this._ids) {
      throw new GameError("UserInputManager not initialised");
    }

    if (this._ids.settingsButton) {
      this._setButtonActive(this._ids.settingsButton, "button_settings");
    }
  }

  private _onSettingsButtonRelease() {
    if (!this._ids) {
      throw new GameError("UserInputManager not initialised");
    }

    if (this._ids.settingsButton) {
      this._setButtonInactive(this._ids.settingsButton, "button_settings");
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
    const fn = () => renderSys.setOpacity(id, BUTTON_OPACITY_ACTIVE);
    this._scheduler.addFunction(fn, 0);
  }

  private _setButtonInactive(id: EntityId, buttonName: string) {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    const fn = () => renderSys.setOpacity(id, BUTTON_OPACITY_INACTIVE);
    this._scheduler.addFunction(fn, 0);
  }

  private _constructButton(buttonName: string,
                           onPress: () => void,
                           onRelease: () => void) {
    const id = getNextEntityId();

    const staticImages: StaticImage[] = [
      {
        name: `${buttonName}.png`
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

    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    renderSys.setOpacity(id, BUTTON_OPACITY_INACTIVE);

    return id;
  }
}
