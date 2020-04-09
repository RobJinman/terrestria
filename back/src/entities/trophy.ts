import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityId } from "../common/system";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";
import { CSpatial } from "../spatial_component";
import { Rectangle } from "../common/geometry";
import { CCollectable } from "../inventory_system";
import { AgentSystem } from "../agent_system";
import { GameEventType, GameEvent, EAgentAction,
         AgentActionType, ERequestGameEnd } from "../common/event";
import { CBehaviour, BehaviourSystem } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";
import { addCollectableBehaviour } from "./utils/collectables";

export function constructTrophy(em: EntityManager,
                                desc: any): EntityId {
  const id = getNextEntityId();

  const gridModeProps = {
    solid: true,
    blocking: true,
    stackable: false,
    squashable: false,
    heavy: true,
    movable: false,
    isAgent: false
  };

  const freeModeProps = {
    heavy: true,
    fixedAngle: false
  };

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);
  const behaviourSys = <BehaviourSystem>em.getSystem(ComponentType.BEHAVIOUR);

  const spatialComp = new CSpatial(id,
                                   false,
                                   spatialSys.grid,
                                   gridModeProps,
                                   freeModeProps,
                                   new Rectangle(64, 64));

  const invComp = new CCollectable(id, "trophies", 1);

  const behComp = new CBehaviour(id);

  em.addEntity(id, EntityType.TROPHY, desc, [ spatialComp,
                                              invComp,
                                              behComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  addCollectableBehaviour(em, id, EntityType.TROPHY);

  behaviourSys.addTargetedEventHandler(id,
                                       GameEventType.AGENT_ACTION,
                                       e => onAgentAction(e, em));

  return id;
}

function onAgentAction(e: GameEvent, em: EntityManager) {
  const agentSys = <AgentSystem>em.getSystem(ComponentType.AGENT);

  const event = <EAgentAction>e;

  if (event.actionType == AgentActionType.COLLECT) {
    agentSys.grantAward(event.agentId, "trophy_collect");

    const gameOver: ERequestGameEnd = {
      type: GameEventType.REQUEST_GAME_END,
      entities: [],
      secondsFromNow: 5
    };

    em.postEvent(gameOver);
  }
}
