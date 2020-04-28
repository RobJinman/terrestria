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

// As a percentage of viewport width
const NOTIFICATION_WIDTH = 0.8;
// As a percentage of viewport height
const NOTIFICATION_HEIGHT = 0.2;
// As a percentage of notification height
const NOTIFICATION_RADIUS = 0.5;
// As a percentage of notification height
const NOTIFICATION_FONT_SIZE = 0.3;
// As a percentage of viewport height
const NOTIFICATION_Y = 0.5;

const NOTIFICATION_BG_COLOUR = new Colour(0, 0, 0, 1);
const NOTIFICATION_CAPTION_COLOUR = new Colour(1, 1, 1, 1);

export function constructGameOverNotification(em: EntityManager,
                                              scheduler: Scheduler) {
  const id = getNextEntityId();

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);
  const W = renderSys.viewW_px;
  const H = renderSys.viewH_px;

  const bgW = NOTIFICATION_WIDTH * W;
  const bgH = NOTIFICATION_HEIGHT * H;

  const shape = new RoundedRectangle(bgW,
                                     bgH,
                                     NOTIFICATION_RADIUS * bgH);

  const renderOpts: RenderOptions = {
    screenPosition: { x: 0, y: 0 },
    zIndex: UI_Z_INDEX + 1
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

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);
  const H = renderSys.viewH_px;

  const bgH = NOTIFICATION_HEIGHT * H;

  const renderOpts: RenderOptions = {
    screenPosition: { x: 0, y: 0 },
    zIndex: UI_Z_INDEX + 2
  };

  const caption = "Game finished. Restarting...";

  const renderComp = new CText(id,
                               caption,
                               NOTIFICATION_FONT_SIZE * bgH,
                               NOTIFICATION_CAPTION_COLOUR,
                               renderOpts);

  em.addEntity(id, EntityType.OTHER, [ renderComp ]);

  return id;
}

function positionBg(id: EntityId, renderSys: RenderSystem) {
  const W = renderSys.viewW_px;
  const H = renderSys.viewH_px;

  const bgW = NOTIFICATION_WIDTH * W;
  const bgH = NOTIFICATION_HEIGHT * H;
  const bgX = (renderSys.viewW_px - bgW) * 0.5;
  const bgY = (renderSys.viewH_px - bgH) * NOTIFICATION_Y;

  renderSys.setScreenPosition(id, bgX, bgY);
}

function positionText(id: EntityId, renderSys: RenderSystem) {
  const W = renderSys.viewW_px;
  const H = renderSys.viewH_px;

  const renderComp = <CText>renderSys.getComponent(id);

  const bgH = NOTIFICATION_HEIGHT * H;
  const bgY = (H - bgH) * NOTIFICATION_Y;

  const textW = renderComp.width;
  const textH = renderComp.height;

  const textX = (W - textW) * 0.5;
  const textY = bgY + 0.5 * (bgH - textH);

  renderSys.setScreenPosition(id, textX, textY);
}
