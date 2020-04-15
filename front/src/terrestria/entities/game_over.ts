import { EntityManager, getNextEntityId } from "../entity_manager";
import { GameEventType } from "../common/event";
import { EventHandlerFn, CBehaviour } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";
import { RenderSystem, RenderOptions, CShape, Colour,
         CText } from "../render_system";
import { ComponentType } from "../common/component_types";
import { UI_Z_INDEX } from "../constants";
import { RoundedRectangle } from "../common/geometry";
import { Scheduler } from "../common/scheduler";
import { EntityId } from "../common/system";

const NOTIFICATION_WIDTH = 500;
const NOTIFICATION_HEIGHT = 100;
const NOTIFICATION_RADIUS = 50;
const NOTIFICATION_FONT_SIZE = 26;
const NOTIFICATION_Y = 0.5; // As percentage from top of screen
const NOTIFICATION_BG_COLOUR = new Colour(0, 0, 0, 0.8);
const NOTIFICATION_CAPTION_COLOUR = new Colour(1, 1, 1, 1);

export function constructGameOverNotification(em: EntityManager,
                                              scheduler: Scheduler) {
  const id = getNextEntityId();

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const shape = new RoundedRectangle(NOTIFICATION_WIDTH,
                                     NOTIFICATION_HEIGHT,
                                     NOTIFICATION_RADIUS);

  const renderOpts: RenderOptions = {
    screenPosition: { x: 0, y: 0 },
    zIndex: UI_Z_INDEX
  };

  const renderComp = new CShape(id, shape, NOTIFICATION_BG_COLOUR, renderOpts);

  const targetedHandlers = new Map<GameEventType, EventHandlerFn>();
  const broadcastHandlers = new Map<GameEventType, EventHandlerFn>();

  const textId = constructText(em);

  broadcastHandlers.set(GameEventType.GAME_ENDING, () => {
    scheduler.addFunction(() => {
      positionBg(id, renderSys);
      positionText(textId, renderSys);

      renderSys.setVisible(id, true);
      renderSys.setVisible(textId, true);
    }, 2000);
  });

  const behaviourComp = new CBehaviour(id,
                                       targetedHandlers,
                                       broadcastHandlers);

  em.addEntity(id, EntityType.OTHER, [ renderComp, behaviourComp ]);

  em.addChildToEntity(id, textId);

  renderSys.setVisible(id, false);
  renderSys.setVisible(textId, false);
}

function constructText(em: EntityManager) {
  const id = getNextEntityId();

  const renderOpts: RenderOptions = {
    screenPosition: { x: 0, y: 0 },
    zIndex: UI_Z_INDEX + 1
  };

  const caption = "Game finished. Restarting...";

  const renderComp = new CText(id,
                               caption,
                               NOTIFICATION_FONT_SIZE,
                               NOTIFICATION_CAPTION_COLOUR,
                               renderOpts);

  em.addEntity(id, EntityType.OTHER, [ renderComp ]);

  return id;
}

function positionBg(id: EntityId, renderSys: RenderSystem) {
  const bgX = (renderSys.viewW - NOTIFICATION_WIDTH) * 0.5;
  const bgY = (renderSys.viewH - NOTIFICATION_HEIGHT) * NOTIFICATION_Y;

  renderSys.setScreenPosition(id, bgX, bgY);
}

function positionText(id: EntityId, renderSys: RenderSystem) {
  const renderComp = <CText>renderSys.getComponent(id);

  const bgH = NOTIFICATION_HEIGHT;
  const bgY = (renderSys.viewH - bgH) * NOTIFICATION_Y;

  const textW = renderComp.width;
  const textH = renderComp.height;

  const textX = (renderSys.viewW - textW) * 0.5;
  const textY = bgY + 0.5 * (bgH - textH);

  renderSys.setScreenPosition(id, textX, textY);
}
