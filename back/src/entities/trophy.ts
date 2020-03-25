import { ServerEntityManager, getNextEntityId } from "../server_entity_manager";
import { EntityId } from "../common/system";
import { ServerSpatialSystem } from "../server_spatial_system";
import { ComponentType } from "../common/component_types";
import { ServerSpatialComponent } from "../server_spatial_component";
import { Rectangle } from "../common/geometry";
import { InventorySystem, CCollectable } from "../inventory_system";
import { AgentSystem } from "../agent_system";
import { GameEventType, EAgentEnterCell, EAwardGranted } from "../common/event";
import { EventHandlerFn, BehaviourComponent } from "../common/behaviour_system";
import { CreateAwardResult } from "../pinata";
import { GameError } from "../common/error";
import { EntityType } from "../common/game_objects";

export function constructTrophy(em: ServerEntityManager,
                         desc: any): EntityId {
  const id = getNextEntityId();

  const gridModeProps = {
    solid: true,
    blocking: false,
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

  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new ServerSpatialComponent(id,
                                                 spatialSys.grid,
                                                 gridModeProps,
                                                 freeModeProps,
                                                 new Rectangle(64, 64));

  const inventorySys = <InventorySystem>em.getSystem(ComponentType.INVENTORY);
  const invComp = new CCollectable(id, "trophies", 1);

  const agentSys = <AgentSystem>em.getSystem(ComponentType.AGENT);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_ENTER_CELL, e => {
    const event = <EAgentEnterCell>e;
    inventorySys.collectItem(event.entityId, id);

    agentSys.grantAward(event.entityId, "special_item_collect")
    .then(response => {
      if (response !== null) {
        if (response.result == CreateAwardResult.SUCCESS) {
          const awardEvent: EAwardGranted = {
            type: GameEventType.AWARD_GRANTED,
            entities: [event.entityId],
            name: "special_item_collect",
            fetti: response.fetti
          };
          em.submitEvent(awardEvent);
        }
      }
      else {
        // TODO: Handle not logged-in user
      }
    }, reason => {
      throw new GameError(`failed to grant award: ${reason}`);
    });

    em.removeEntity_onClients(id);
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.TROPHY, desc, [ spatialComp,
                                              invComp,
                                              behaviourComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}
