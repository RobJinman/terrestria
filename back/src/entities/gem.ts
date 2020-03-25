import { ServerEntityManager, getNextEntityId } from "../server_entity_manager";
import { EntityId } from "../common/system";
import { Polygon } from "../common/geometry";
import { ServerSpatialSystem } from "../server_spatial_system";
import { ComponentType } from "../common/component_types";
import { ServerSpatialComponent } from "../server_spatial_component";
import { InventorySystem, CCollectable } from "../inventory_system";
import { GameEventType, EAgentEnterCell,
         EEntityCollision } from "../common/event";
import { EventHandlerFn, BehaviourComponent } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";

export function constructGem(em: ServerEntityManager, desc: any): EntityId {
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

  const points = [
    { x: 0, y: 20 },
    { x: 32, y: 64 },
    { x: 64, y: 20 },
    { x: 54, y: 0 },
    { x: 10, y: 0 }
  ];
  const shape = new Polygon(points);

  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new ServerSpatialComponent(id,
                                                 spatialSys.grid,
                                                 gridModeProps,
                                                 freeModeProps,
                                                 shape);

  const invComp = new CCollectable(id, "gems", 1);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_ENTER_CELL,
                     e => onAgentEnterCell(em, id, <EAgentEnterCell>e));
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => em.removeEntity(id));
  targetedEvents.set(GameEventType.ENTITY_COLLISION,
                     e => onEntityCollision(em, id, <EEntityCollision>e));

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.GEM, desc, [ spatialComp,
                                           invComp,
                                           behaviourComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}

function onAgentEnterCell(em: ServerEntityManager,
                          gemId: EntityId,
                          event: EAgentEnterCell) {
  const inventorySys = <InventorySystem>em.getSystem(ComponentType.INVENTORY);

  inventorySys.collectItem(event.entityId, gemId);
  em.removeEntity_onClients(gemId);
}

function onEntityCollision(em: ServerEntityManager,
                           gemId: EntityId,
                           event: EEntityCollision) {
  const agentSys = <InventorySystem>em.getSystem(ComponentType.AGENT);
  const inventorySys = <InventorySystem>em.getSystem(ComponentType.INVENTORY);

  const other = event.entityA == gemId ? event.entityB : event.entityA;

  if (agentSys.hasComponent(other)) {
    inventorySys.collectItem(other, gemId);
    em.removeEntity_onClients(gemId);
  }
}
