import { AudioManager } from "../audio_manager";
import { CBehaviour, EventHandlerMap } from "../common/behaviour_system";
import { getNextEntityId, EntityManager } from "../entity_manager";
import { GameEventType, GameEvent, EAgentAction, AgentActionType, EEntityHit,
         EGemsBanked, EPlayerKilled } from "../common/event";
import { EntityType } from "../common/game_objects";
import { ComponentType } from "../common/component_types";
import { RenderSystem } from "../render_system";
import { CSpatial } from "../spatial_component";
import { BLOCK_SZ, FALL_SPEED } from "../common/constants";
import { Scheduler } from "../common/scheduler";

export function constructSfx(em: EntityManager,
                             am: AudioManager,
                             scheduler: Scheduler) {
  const id = getNextEntityId();

  am.addSound("bang");
  am.addSound("push");
  am.addSound("dig");
  am.addSound("collect");
  am.addSound("award");
  am.addSound("thud");
  am.addSound("bank");

  const targetedHandlers: EventHandlerMap = new Map();
  const broadcastHandlers: EventHandlerMap = new Map([
    [ GameEventType.AWARD_GRANTED, () => am.playSound("award", 0) ],
    [ GameEventType.AGENT_ACTION, (e: GameEvent) => onAgentAction(em, am, e) ],
    [ GameEventType.ENTITY_HIT, (e: GameEvent) =>
                                  onEntityHit(em, am, scheduler, e) ],
    [ GameEventType.GEMS_BANKED, (e: GameEvent) => onGemsBanked(em, am, e) ],
    [ GameEventType.PLAYER_KILLED, (e: GameEvent) => onPlayerKilled(em, am, e) ]
  ]);

  const behaviourComp = new CBehaviour(id, targetedHandlers, broadcastHandlers);

  em.addEntity(id, EntityType.OTHER, [ behaviourComp ]);
}

function onAgentAction(em: EntityManager, am: AudioManager, e: GameEvent) {
  const event = <EAgentAction>e;
  const agentSpatial = <CSpatial>em.getComponent(ComponentType.SPATIAL,
                                                 event.agentId);

  const distance = getDistanceFromViewport(em,
                                           agentSpatial.x_abs,
                                           agentSpatial.y_abs);

  switch (event.actionType) {
    case AgentActionType.PUSH: {
      am.playSound("push", distance);
      break;
    }
    case AgentActionType.DIG: {
      am.playSound("dig", distance);
      break;
    }
    case AgentActionType.COLLECT: {
      event.agentId
      am.playSound("collect", distance);
      break;
    }
    // ...
  }
}

function onPlayerKilled(em: EntityManager, am: AudioManager, e: GameEvent) {
  const event = <EPlayerKilled>e;

  const spatial = <CSpatial>em.getComponent(ComponentType.SPATIAL,
                                                  event.playerId);

  const distance = getDistanceFromViewport(em, spatial.x_abs, spatial.y_abs);

  am.playSound("bang", distance);
}

function onEntityHit(em: EntityManager,
                     am: AudioManager,
                     scheduler: Scheduler,
                     e: GameEvent) {
  const event = <EEntityHit>e;

  const distance = getDistanceFromViewport(em,
                                           event.gridX * BLOCK_SZ,
                                           event.gridY * BLOCK_SZ);

  scheduler.addFunction(() => am.playSound("thud", distance),
                        1000 / FALL_SPEED);
}

function onGemsBanked(em: EntityManager, am: AudioManager, e: GameEvent) {
  const event = <EGemsBanked>e;
  const agentSpatial = <CSpatial>em.getComponent(ComponentType.SPATIAL,
                                                 event.playerId);
  const x = agentSpatial.x_abs;
  const y = agentSpatial.y_abs;

  const distance = getDistanceFromViewport(em, x, y);

  am.playSound("bank", distance);
}

function getDistanceFromViewport(em: EntityManager, x: number, y: number) {
  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const viewportX0 = renderSys.cameraX - renderSys.viewW * 0.5;
  const viewportX1 = renderSys.cameraX + renderSys.viewW * 0.5;
  const viewportY0 = renderSys.cameraY - renderSys.viewH * 0.5;
  const viewportY1 = renderSys.cameraY + renderSys.viewH * 0.5;

  let dx = 0;
  let dy = 0;
  if (x > viewportX1) {
    dx = x - viewportX1;
  }
  if (x < viewportX0) {
    dx = viewportX0 - x;
  }
  if (y > viewportY1) {
    dy = y - viewportY1;
  }
  if (y < viewportY0) {
    dy = viewportY0 - y;
  }

  return Math.sqrt(dx * dx + dy * dy);
}
