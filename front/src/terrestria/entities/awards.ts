import { EntityManager, getNextEntityId } from "../entity_manager";
import { GameEventType, GameEvent, EClientAwardGranted,
         EAwardDisplayed } from "../common/event";
import { EventHandlerFn, CBehaviour } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";
import { CShape, RenderSystem, Colour, RenderOptions,
         CText } from "../render_system";
import { Rectangle } from "../common/geometry";
import { UI_Z_INDEX } from "../constants";
import { Scheduler } from "../common/scheduler";
import { ComponentType } from "../common/component_types";

const NOTIFICATION_DURATION_MS = 2000;
const NOTIFICATION_DELAY_MS = 500;

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

  cantShowUntil.value = t + NOTIFICATION_DURATION_MS;

  scheduler.addFunction(() => displayNotification(em, scheduler, event), dt);
}

function displayNotification(em: EntityManager,
                             scheduler: Scheduler,
                             event: EClientAwardGranted) {
    const bgId = constructBg(em);
    const textId = constructText(em, event);
    //const iconId = constructIcon(em);

    const displayedEvent: EAwardDisplayed = {
      type: GameEventType.AWARD_DISPLAYED,
      entities: []
    };
    em.postEvent(displayedEvent);

    scheduler.addFunction(() => {
      em.removeEntity(bgId);
      em.removeEntity(textId);
      //em.removeEntity(iconId);
    }, NOTIFICATION_DURATION_MS);
}

function constructBg(em: EntityManager) {
  const id = getNextEntityId();

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const bgW = 500;
  const bgH = 70;
  const bgX = (renderSys.viewW - bgW) * 0.5;
  const bgY = (renderSys.viewH - bgH) * 0.5;

  const shape = new Rectangle(bgW, bgH);

  const renderOpts: RenderOptions = {
    screenPosition: { x: bgX, y: bgY },
    zIndex: UI_Z_INDEX
  };

  const colour = new Colour(0, 0, 0, 0.5);
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

  const renderComp = new CText(id, "Award: " + event.name, 20, colour, renderOpts);

  em.addEntity(id, EntityType.OTHER, [ renderComp ]);

  const textW = renderComp.width;
  const textH = renderComp.height;

  const textX = (renderSys.viewW - textW) * 0.5;
  const textY = (renderSys.viewH - textH) * 0.5;

  renderSys.setScreenPosition(id, textX, textY);

  return id;
}
