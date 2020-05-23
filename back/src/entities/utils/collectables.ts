import { EntityManager } from "../../entity_manager";
import { EntityId } from "../../common/system";
import { EAgentBlocked, EEntityCollision, GameEventType, GameEvent,
         EAgentAction, AgentActionType } from "../../common/event";
import { InventorySystem } from "../../inventory_system";
import { ComponentType } from "../../common/component_types";
import { BehaviourSystem } from "../../common/behaviour_system";
import { CSpatial } from "../../spatial_component";
import { PLAYER_SPEED } from "../../common/constants";
import { AgentSystem } from "../../agent_system";
import { EntityType } from "../../common/game_objects";

function onAgentBlocked(em: EntityManager,
                        collectableId: EntityId,
                        collectableType: EntityType,
                        event: EAgentBlocked) {
  const inventorySys = <InventorySystem>em.getSystem(ComponentType.INVENTORY);

  if (inventorySys.collectItem(event.entityId, collectableId)) {
    const collectableSpatial = <CSpatial>em.getComponent(ComponentType.SPATIAL,
                                                         collectableId);

    const agentSpatial = <CSpatial>em.getComponent(ComponentType.SPATIAL,
                                                   event.entityId);

    agentSpatial.gridMode.stop();
    agentSpatial.gridMode.moveToPos(collectableSpatial.x,
                                    collectableSpatial.y,
                                    1.0 / PLAYER_SPEED);

    const collect: EAgentAction = {
      type: GameEventType.AGENT_ACTION,
      entities: [ event.entityId, collectableId ],
      agentId: event.entityId,
      actionType: AgentActionType.COLLECT,
      direction: event.direction,
      collectedType: collectableType
    };

    em.submitEvent(collect);
    em.removeEntity(collectableId);
  }
}

function onEntityCollision(em: EntityManager,
                           collectableId: EntityId,
                           collectableType: EntityType,
                           event: EEntityCollision) {
  const other = event.entityA == collectableId ? event.entityB : event.entityA;

  const agentSys = <AgentSystem>em.getSystem(ComponentType.AGENT);

  if (agentSys.hasComponent(other)) {
    const agent = agentSys.getComponent(other);

    const inventorySys = <InventorySystem>em.getSystem(ComponentType.INVENTORY);
    if (inventorySys.collectItem(other, collectableId)) {
      const collect: EAgentAction = {
        type: GameEventType.AGENT_ACTION,
        entities: [ other, collectableId ],
        agentId: other,
        actionType: AgentActionType.COLLECT,
        direction: agent.lastDirectionMoved,
        collectedType: collectableType
      };

      em.submitEvent(collect);
      em.removeEntity(collectableId);
    }
  }
}

export function addCollectableBehaviour(em: EntityManager,
                                        entityId: EntityId,
                                        entityType: EntityType) {

  const onAgentBlockedFn = (e: GameEvent) => {
    onAgentBlocked(em, entityId, entityType, <EAgentBlocked>e);
  };

  const onEntityCollisionFn = (e: GameEvent) => {
    onEntityCollision(em, entityId, entityType, <EEntityCollision>e);
  };

  const behaviourSys = <BehaviourSystem>em.getSystem(ComponentType.BEHAVIOUR);

  behaviourSys.addTargetedEventHandler(entityId,
                                       GameEventType.AGENT_BLOCKED,
                                       onAgentBlockedFn);
  behaviourSys.addTargetedEventHandler(entityId,
                                       GameEventType.ENTITY_BURNED,
                                       e => em.removeEntity(entityId));
  behaviourSys.addTargetedEventHandler(entityId,
                                       GameEventType.ENTITY_COLLISION,
                                       onEntityCollisionFn);
}
