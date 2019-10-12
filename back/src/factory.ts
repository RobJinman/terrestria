import { getNextEntityId, EntityManager } from "./common/entity_manager";
import { AgentComponent } from "./common/agent_system";
import { SpatialComponent } from "./common/spatial_system";
import { EntityType } from "./common/game_objects";
import { GameEventType, EAgentEnterCell,
         EEntitySquashed } from "./common/event";
import { BehaviourComponent, EventHandlerFn } from "./behaviour_system";
import { EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { InventorySystem, CCollector, CCollectable,
         Bucket } from "./inventory_system";

export function constructSoil(em: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    stackable: true,
    heavy: false,
    movable: false,
    isAgent: false
  });

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_ENTER_CELL, e => em.removeEntity(id));

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.SOIL, [ spatialComp, behaviourComp ]);

  return id;
}

export function constructRock(em: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: true,
    stackable: false,
    heavy: true,
    movable: true,
    isAgent: false
  });

  em.addEntity(id, EntityType.ROCK, [ spatialComp ]);

  return id;
}

export function constructGem(em: EntityManager): EntityId {
  const id = getNextEntityId();

  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    stackable: false,
    heavy: true,
    movable: false,
    isAgent: false
  });

  const inventorySys = <InventorySystem>em.getSystem(ComponentType.INVENTORY);
  const invComp = new CCollectable(id, "gems", 1);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_ENTER_CELL, e => {
    const event = <EAgentEnterCell>e;
    inventorySys.collectItem(event.entityId, id);

    em.removeEntity(id); // TODO: Play animation, then delete
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.GEM, [ spatialComp, invComp, behaviourComp ]);

  return id;
}

export function constructPlayer(em: EntityManager,
                                pinataId: string,
                                pinataToken: string): EntityId {
  const id = getNextEntityId();

  const agentComp = new AgentComponent(id, pinataId, pinataToken);
  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    stackable: true,
    heavy: false,
    movable: false,
    isAgent: true
  });
  
  const invComp = new CCollector(id);
  invComp.addBucket(new Bucket("gems", -1));

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_SQUASHED, e => {
    const event = <EEntitySquashed>e;

    console.log("Ouch!");
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.PLAYER, [ spatialComp,
                                        agentComp,
                                        invComp,
                                        behaviourComp ]);

  return id;
}
