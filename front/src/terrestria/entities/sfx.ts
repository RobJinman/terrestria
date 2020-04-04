import { AudioManager } from "../audio_manager";
import { CBehaviour, EventHandlerMap } from "../common/behaviour_system";
import { getNextEntityId, EntityManager } from "../entity_manager";
import { GameEventType, GameEvent, EAgentAction,
         AgentActionType } from "../common/event";
import { EntityType } from "../common/game_objects";

export function constructSfx(em: EntityManager, am: AudioManager) {
  const id = getNextEntityId();

  const targetedHandlers: EventHandlerMap = new Map();
  const broadcastHandlers: EventHandlerMap = new Map([
    [ GameEventType.AWARD_GRANTED, () => am.playSound("award") ],
    [ GameEventType.AGENT_ACTION, (e: GameEvent) => onAgentAction(am, e) ],
    [ GameEventType.ENTITY_HIT, () => am.playSound("thud") ]
  ]);

  const behaviourComp = new CBehaviour(id, targetedHandlers, broadcastHandlers);

  em.addEntity(id, EntityType.OTHER, [ behaviourComp ]);
}

function onAgentAction(am: AudioManager, e: GameEvent) {
  const event = <EAgentAction>e;

  switch (event.actionType) {
    case AgentActionType.PUSH: {
      am.playSound("push");
      break;
    }
    case AgentActionType.COLLECT: {
      am.playSound("collect");
      break;
    }
    // ...
  }
}
