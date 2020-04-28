import { EntityManager, getNextEntityId } from "../entity_manager";
import { CText, Colour, RenderSystem } from "../render_system";
import { EntityType } from "../common/game_objects";
import { ComponentType } from "../common/component_types";
import { EntityId } from "../common/system";
import { CBehaviour, EventHandlerMap } from "../common/behaviour_system";
import { GameEventType, GameEvent, EClientScoreChanged } from "../common/event";
import { UI_Z_INDEX, BLOCK_SZ_PX } from "../constants";

export function constructHud(em: EntityManager) {
  const id = getNextEntityId();

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const renderComp = new CText(id, "Score: 0", 10, new Colour(0, 1, 0), {
    screenPosition: {
      x: 0,
      y: 0
    },
    zIndex: UI_Z_INDEX
  });

  const broadcastHandlers: EventHandlerMap = new Map([
    [ GameEventType.WINDOW_RESIZED, event => centreComponent(id, renderSys) ],
    [ GameEventType.CLIENT_SCORE_CHANGED, event => onScoreChanged(event,
                                                                  renderComp) ],
    [ GameEventType.PLAYER_RESPAWNED, event => onRespawn(renderComp) ]
  ]);

  const behaviourComp = new CBehaviour(id, new Map(), broadcastHandlers);

  em.addEntity(id, EntityType.OTHER, [ renderComp, behaviourComp ]);
}

function centreComponent(id: EntityId, renderSys: RenderSystem) {
  const c = <CText>renderSys.getComponent(id);
  const viewW = renderSys.viewW_px;

  c.screenPosition = {
    x: 0.5 * (viewW - c.width),
    y: BLOCK_SZ_PX * 0.5
  };
}

function onScoreChanged(e: GameEvent, display: CText) {
  const event = <EClientScoreChanged>e;
  display.text = `Score: ${event.score}`;
}

function onRespawn(display: CText) {
  display.text = `Score: 0`;
}
