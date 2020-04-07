import { EntityManager, getNextEntityId } from "../entity_manager";
import { GameEventType, GameEvent, EClientAwardGranted,
         EAwardDisplayed } from "../common/event";
import { EventHandlerFn, CBehaviour } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";
import { CShape, RenderSystem, Colour, RenderOptions, CText, CSprite,
         StaticImage } from "../render_system";
import { Rectangle } from "../common/geometry";
import { UI_Z_INDEX } from "../constants";
import { Scheduler } from "../common/scheduler";
import { ComponentType } from "../common/component_types";

const NOTIFICATION_DURATION_MS = 2000;
const NOTIFICATION_DELAY_MS = 500;

const NOTIFICATION_WIDTH = 500;
const NOTIFICATION_HEIGHT = 100;
const NOTIFICATION_PADDING = 10;
const NOTIFICATION_FONT_SIZE = 26;

const AWARD_STRINGS = new Map<string, string>([
  [ "full_load", "Full load!" ],
  [ "high_score_0", "Banked 10 gems!" ],
  [ "high_score_1", "Banked 25 gems!" ],
  [ "high_score_2", "Banked 50 gems!" ],
  [ "high_score_3", "Banked 75 gems!" ],
  [ "trophy_collect", "Trophy collected!" ]
]);

export function constructAwardNotification(em: EntityManager,
                                           scheduler: Scheduler) {
  const id = getNextEntityId();

  const targetedHandlers = new Map<GameEventType, EventHandlerFn>();
  const broadcastHandlers = new Map<GameEventType, EventHandlerFn>();

  const cantShowUntil = { value: 0 };

  broadcastHandlers.set(GameEventType.CLIENT_AWARD_GRANTED,
                        event => onAwardGranted(em,
                                                scheduler,
                                                cantShowUntil,
                                                event));

  const behaviourComp = new CBehaviour(id,
                                       targetedHandlers,
                                       broadcastHandlers);

  em.addEntity(id, EntityType.OTHER, [ behaviourComp ]);
}

function onAwardGranted(em: EntityManager,
                        scheduler: Scheduler,
                        cantShowUntil: { value: number },
                        e: GameEvent) {
  const event = <EClientAwardGranted>e;

  const now = (new Date()).getTime();
  const idealShow = now + NOTIFICATION_DELAY_MS;
  const t = Math.max(cantShowUntil.value, idealShow);
  const dt = t - now;

  cantShowUntil.value = t + NOTIFICATION_DURATION_MS + NOTIFICATION_DELAY_MS;

  scheduler.addFunction(() => displayNotification(em, scheduler, event), dt);
}

function displayNotification(em: EntityManager,
                             scheduler: Scheduler,
                             event: EClientAwardGranted) {
    const bgId = constructBg(em);
    const textId = constructText(em, event);
    const iconId = constructIcon(em, event);
    const fettiId = event.loggedOut ? -1 : constructFetti(em, event);

    const displayedEvent: EAwardDisplayed = {
      type: GameEventType.AWARD_DISPLAYED,
      entities: []
    };
    em.postEvent(displayedEvent);

    scheduler.addFunction(() => {
      em.removeEntity(bgId);
      em.removeEntity(textId);
      em.removeEntity(iconId);
      if (fettiId !== -1) {
        em.removeEntity(fettiId);
      }
    }, NOTIFICATION_DURATION_MS);
}

function constructBg(em: EntityManager) {
  const id = getNextEntityId();

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const bgW = NOTIFICATION_WIDTH;
  const bgH = NOTIFICATION_HEIGHT;
  const bgX = (renderSys.viewW - bgW) * 0.5;
  const bgY = (renderSys.viewH - bgH) * 0.5;

  const shape = new Rectangle(bgW, bgH);

  const renderOpts: RenderOptions = {
    screenPosition: { x: bgX, y: bgY },
    zIndex: UI_Z_INDEX
  };

  const colour = new Colour(0, 0, 0.6, 1);
  const renderComp = new CShape(id, shape, colour, renderOpts);

  em.addEntity(id, EntityType.OTHER, [ renderComp ]);

  return id;
}

function constructText(em: EntityManager, event: EClientAwardGranted) {
  const id = getNextEntityId();

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const renderOpts: RenderOptions = {
    screenPosition: { x: 0, y: 0 },
    zIndex: UI_Z_INDEX
  };

  const colour = new Colour(1, 1, 1, 1);
  const caption = AWARD_STRINGS.get(event.name) || `Award: ${event.name}`;

  const renderComp = new CText(id,
                               caption,
                               NOTIFICATION_FONT_SIZE,
                               colour,
                               renderOpts);

  em.addEntity(id, EntityType.OTHER, [ renderComp ]);

  const textW = renderComp.width;
  const textH = renderComp.height;

  const textX = (renderSys.viewW - textW) * 0.5;
  const textY = (renderSys.viewH - textH) * 0.5;

  renderSys.setScreenPosition(id, textX, textY);

  return id;
}

function constructIcon(em: EntityManager, event: EClientAwardGranted) {
  const id = getNextEntityId();

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const renderOpts: RenderOptions = {
    screenPosition: { x: 0, y: 0 },
    zIndex: UI_Z_INDEX
  };

  let imageName = "award_icon.png";
  if (event.loggedOut) {
    imageName = "award_icon_signed_out.png";
  }
  else if (event.fetti === 0) {
    imageName = "award_icon_null.png";
  }

  const iconSz = NOTIFICATION_HEIGHT - NOTIFICATION_PADDING * 2;

  const staticImages: StaticImage[] = [
    {
      name: imageName,
      width: iconSz,
      height: iconSz
    }
  ];

  const renderComp = new CSprite(id, staticImages, [], imageName, renderOpts);

  em.addEntity(id, EntityType.OTHER, [ renderComp ]);

  const bgW = NOTIFICATION_WIDTH;
  const bgX = (renderSys.viewW - bgW) * 0.5;

  const iconX = bgX + NOTIFICATION_PADDING;
  const iconY = (renderSys.viewH - iconSz) * 0.5;

  renderSys.setScreenPosition(id, iconX, iconY);

  return id;
}

function constructFetti(em: EntityManager, event: EClientAwardGranted) {
  const id = getNextEntityId();

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const renderOpts: RenderOptions = {
    screenPosition: { x: 0, y: 0 },
    zIndex: UI_Z_INDEX
  };

  const colour = new Colour(0, 1, 0, 1);
  const caption = `${event.fetti} fetti`;

  const renderComp = new CText(id,
                               caption,
                               NOTIFICATION_FONT_SIZE,
                               colour,
                               renderOpts);

  em.addEntity(id, EntityType.OTHER, [ renderComp ]);

  const bgW = NOTIFICATION_WIDTH;
  const bgX0 = (renderSys.viewW - bgW) * 0.5;
  const bgX1 = bgX0 + bgW;

  const textW = renderComp.width;
  const textH = renderComp.height;

  const textX1 = bgX1 - NOTIFICATION_PADDING;
  const textX0 = textX1 - textW;
  const textY = (renderSys.viewH - textH) * 0.5;

  renderSys.setScreenPosition(id, textX0, textY);

  return id;
}
