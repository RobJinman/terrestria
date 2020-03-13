import { UserInput } from "./common/action";
import { EntityType } from "./common/game_objects";
import { SpriteRenderComponent, StaticImage, RenderOptions, 
         RenderSystem } from "./render_system";
import { ClientEntityManager, getNextEntityId } from "./client_entity_manager";
import { EntityId } from "./common/system";
import { BehaviourComponent, EventHandlerFn } from "./common/behaviour_system";
import { GameEventType } from "./common/event";
import { ComponentType } from "./common/component_types";
import { Scheduler } from "./scheduler";

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
  private _em: ClientEntityManager;
  private _scheduler: Scheduler;
  private _entityId: EntityId;
  private _onDirectionPressHandler: DirectionInputHandlerFn;
  private _onDirectionReleaseHandler: DirectionInputHandlerFn;
  private _onEnterHandler: VoidInputHandlerFn;
  private _upArrow: EntityId|null = null;
  private _rightArrow: EntityId|null = null;
  private _downArrow: EntityId|null = null;
  private _leftArrow: EntityId|null = null;
  private _fullscreenButton: EntityId|null = null;

  constructor(em: ClientEntityManager,
              scheduler: Scheduler,
              onDirectionPressHandler: DirectionInputHandlerFn,
              onDirectionReleaseHandler: DirectionInputHandlerFn,
              onEnterHandler: VoidInputHandlerFn) {
    this._em = em;
    this._scheduler = scheduler;

    this._onDirectionPressHandler = onDirectionPressHandler;
    this._onDirectionReleaseHandler = onDirectionReleaseHandler;
    this._onEnterHandler = onEnterHandler;

    window.addEventListener("keydown", event => this._onKeyDown(event), false);
    window.addEventListener("keyup", event => this._onKeyUp(event), false);
    document.addEventListener("fullscreenchange",
                              () => this._onFullscreenChange(),
                              false);

    this._entityId = getNextEntityId();

    const targetedHandlers = new Map<GameEventType, EventHandlerFn>();
    const broadcastHandlers = new Map<GameEventType, EventHandlerFn>();
    broadcastHandlers.set(GameEventType.WINDOW_RESIZED,
                          this._onWindowResized.bind(this));
    const behaviourComp = new BehaviourComponent(this._entityId,
                                                 targetedHandlers,
                                                 broadcastHandlers);
    this._em.addEntity(this._entityId, EntityType.OTHER, [ behaviourComp ]);
  }

  initialiseUi() {
    this._upArrow = this._constructArrow(UserInput.UP, "up");
    this._rightArrow = this._constructArrow(UserInput.RIGHT, "right");
    this._downArrow = this._constructArrow(UserInput.DOWN, "down");
    this._leftArrow = this._constructArrow(UserInput.LEFT, "left");

    this._constructFullscreenButton();
  }

  private _onFullscreenChange() {
    if (!document.fullscreen) {
      this._scheduler.addFunction(this._onExitFullscreen.bind(this), 0);
    }
  }

  private _onExitFullscreen() {
    this._constructFullscreenButton();
    this._positionButtons();
  }

  private _onWindowResized() {
    this._positionButtons();
  }

  private _positionButtons() {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);

    if (this._upArrow && this._rightArrow &&
      this._downArrow && this._leftArrow) {

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

      renderSys.setSpriteSize(this._upArrow, w, h);
      renderSys.setSpriteSize(this._rightArrow, w, h);
      renderSys.setSpriteSize(this._downArrow, w, h);
      renderSys.setSpriteSize(this._leftArrow, w, h);

      renderSys.setScreenPosition(this._upArrow, x2, y1);
      renderSys.setScreenPosition(this._rightArrow, x3, y2);
      renderSys.setScreenPosition(this._downArrow, x2, y3);
      renderSys.setScreenPosition(this._leftArrow, x1, y2);
    }
    if (this._fullscreenButton) {
      const w = 0.25 * renderSys.viewH;
      const h = 0.09 * renderSys.viewH;
      const margin = 0.02 * renderSys.viewH;
      renderSys.setSpriteSize(this._fullscreenButton, w, h);
      renderSys.setScreenPosition(this._fullscreenButton, margin, margin);
    }
  }

  private _setButtonActive(input: UserInput, active: boolean) {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    const suffix = active ? "_active" : "";

    switch (input) {
      case UserInput.UP: {
        if (this._upArrow) {
          renderSys.setCurrentImage(this._upArrow, `button_up${suffix}.png`);
        }
        break;
      }
      case UserInput.RIGHT: {
        if (this._rightArrow) {
          renderSys.setCurrentImage(this._rightArrow,
                                    `button_right${suffix}.png`);
        }
        break;
      }
      case UserInput.DOWN: {
        if (this._downArrow) {
          renderSys.setCurrentImage(this._downArrow,
                                    `button_down${suffix}.png`);
        }
        break;
      }
      case UserInput.LEFT: {
        if (this._leftArrow) {
          renderSys.setCurrentImage(this._leftArrow,
                                    `button_left${suffix}.png`);
        }
        break;
      }
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
    if (this._fullscreenButton) {
      this._em.removeEntity(this._fullscreenButton);
      this._fullscreenButton = null;
    }
  }

  private _onArrowPressed(input: UserInput) {
    this._onDirectionPressHandler(input);
    this._scheduler.addFunction(() => this._setButtonActive(input, true), 0);
  }

  private _onArrowReleased(input: UserInput) {
    this._onDirectionReleaseHandler(input);
    this._scheduler.addFunction(() => this._setButtonActive(input, false), 0);
  }

  private _onFullscreenButtonPress() {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    this._scheduler.addFunction(() => {
      if (this._fullscreenButton) {
        renderSys.setCurrentImage(this._fullscreenButton,
                                  "button_fullscreen_active.png");
      }
    }, 0);
  }

  private _onFullscreenButtonRelease() {
    const renderSys = <RenderSystem>this._em.getSystem(ComponentType.RENDER);
    this._scheduler.addFunction(() => {
      if (this._fullscreenButton) {
        renderSys.setCurrentImage(this._fullscreenButton,
                                  "button_fullscreen.png");
      }
    }, 0);
    this._enterFullscreen();
  }

  private _constructFullscreenButton() {
    if (!this._fullscreenButton) {
      const id = getNextEntityId();

      const staticImages: StaticImage[] = [
        {
          name: "button_fullscreen.png"
        },
        {
          name: "button_fullscreen_active.png"
        }
      ];

      const renderOpts: RenderOptions = {
        zIndex: 1,
        screenPosition: { x: 0, y: 0 },
        onPress: () => this._onFullscreenButtonPress(),
        onRelease: () => this._onFullscreenButtonRelease()
      };

      const renderComp = new SpriteRenderComponent(id,
                                                  staticImages,
                                                  [],
                                                  "button_fullscreen.png",
                                                  renderOpts);

      this._em.addEntity(id, EntityType.OTHER, [ renderComp ]);

      this._fullscreenButton = id;
    }
  }

  private _constructArrow(userInput: UserInput, name: string) {
    const id = getNextEntityId();

    const staticImages: StaticImage[] = [
      {
        name: `button_${name}.png`
      },
      {
        name: `button_${name}_active.png`
      }
    ];

    const renderOpts: RenderOptions = {
      zIndex: 1,
      screenPosition: { x: 0, y: 0 },
      onPress: () => this._onArrowPressed(userInput),
      onRelease: () => this._onArrowReleased(userInput)
    };

    const renderComp = new SpriteRenderComponent(id,
                                                 staticImages,
                                                 [],
                                                 `button_${name}.png`,
                                                 renderOpts);

    this._em.addEntity(id, EntityType.OTHER, [ renderComp ]);

    return id;
  }
}
