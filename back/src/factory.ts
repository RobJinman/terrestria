import { getNextEntityId } from "./common/entity_manager";
import { AgentComponent } from "./agent_system";
import { EntityType } from "./common/game_objects";
import { GameEventType, EAgentEnterCell, EEntityBurned, 
         EPlayerKilled } from "./common/event";
import { BehaviourComponent, EventHandlerFn } from "./common/behaviour_system";
import { EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { InventorySystem, CCollector, CCollectable,
         Bucket } from "./inventory_system";
import { ServerEntityManager } from "./server_entity_manager";
import { ServerSpatialSystem } from "./server_spatial_system";
import { ServerSpatialComponent } from "./server_spatial_component";
import { Circle, Polygon } from "./common/geometry";
import { BLOCK_SZ } from "./common/constants";

export function constructSoil(em: ServerEntityManager): EntityId {
  const id = getNextEntityId();

  const gridModeProps = {
    solid: true,
    blocking: false,
    stackable: true,
    heavy: false,
    movable: false,
    isAgent: false
  };

  const freeModeProps = {
    heavy: false,
    fixedAngle: true
  };

  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new ServerSpatialComponent(id,
                                                 spatialSys.grid,
                                                 gridModeProps,
                                                 freeModeProps);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_ENTER_CELL, e => {
    em.removeEntity(id);
  });
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    em.removeEntity(id);
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.SOIL, [ spatialComp, behaviourComp ]);

  return id;
}

export function constructRock(em: ServerEntityManager): EntityId {
  const id = getNextEntityId();

  const gridModeProps = {
    solid: true,
    blocking: true,
    stackable: false,
    heavy: true,
    movable: true,
    isAgent: false
  };

  const freeModeProps = {
    heavy: true,
    fixedAngle: false
  };

  const shape = new Circle(BLOCK_SZ * 0.5);

  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new ServerSpatialComponent(id,
                                                 spatialSys.grid,
                                                 gridModeProps,
                                                 freeModeProps,
                                                 shape);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    em.removeEntity(id);
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.ROCK, [ spatialComp, behaviourComp ]);

  return id;
}

export function constructGem(em: ServerEntityManager): EntityId {
  const id = getNextEntityId();

  const gridModeProps = {
    solid: true,
    blocking: false,
    stackable: false,
    heavy: true,
    movable: false,
    isAgent: false
  };

  const freeModeProps = {
    heavy: true,
    fixedAngle: false
  };

  const points = [
    { x: 0, y: 10 },
    { x: 16, y: 32 },
    { x: 32, y: 10 },
    { x: 27, y: 0 },
    { x: 5, y: 0 }
  ];
  const shape = new Polygon(points);

  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new ServerSpatialComponent(id,
                                                 spatialSys.grid,
                                                 gridModeProps,
                                                 freeModeProps,
                                                 shape);

  const inventorySys = <InventorySystem>em.getSystem(ComponentType.INVENTORY);
  const invComp = new CCollectable(id, "gems", 1);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_ENTER_CELL, e => {
    const event = <EAgentEnterCell>e;
    inventorySys.collectItem(event.entityId, id);

    em.removeEntity_onClients(id);
  });
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    em.removeEntity(id);
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.GEM, [ spatialComp, invComp, behaviourComp ]);

  return id;
}

export function constructPlayer(em: ServerEntityManager,
                                pinataId: string,
                                pinataToken: string): EntityId {
  const id = getNextEntityId();

  const agentComp = new AgentComponent(id, pinataId, pinataToken);

  const gridModeProps = {
    solid: true,
    blocking: false,
    stackable: true,
    heavy: false,
    movable: false,
    isAgent: true
  };

  const freeModeProps = {
    heavy: true,
    fixedAngle: true
  };

  const shape = new Circle(BLOCK_SZ * 0.5);

  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new ServerSpatialComponent(id,
                                                 spatialSys.grid,
                                                 gridModeProps,
                                                 freeModeProps,
                                                 shape);

  const invComp = new CCollector(id);
  invComp.addBucket(new Bucket("gems", -1));

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_SQUASHED, e => {
    const gridX = spatialSys.grid.toGridX(spatialComp.x);
    const gridY = spatialSys.grid.toGridY(spatialComp.y);

    const entities = spatialSys.grid.idsInCells(gridX - 1,
                                                gridX + 1,
                                                gridY - 1,
                                                gridY + 1);

    const burned: EEntityBurned = {
      type: GameEventType.ENTITY_BURNED,
      entities
    };

    const killed: EPlayerKilled = {
      type: GameEventType.PLAYER_KILLED,
      entities: [],
      playerId: id
    };

    em.submitEvent(burned);
    em.submitEvent(killed);
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.PLAYER, [ spatialComp,
                                        agentComp,
                                        invComp,
                                        behaviourComp ]);

  return id;
}
