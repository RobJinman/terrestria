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
import { EntityDesc } from "./common/map_data";
import { DEFAULT_GRID_MODE_PROPS } from "./grid_mode_properties";
import { FreeModeProperties } from "./free_mode_properties";
import { SpatialMode } from "./common/spatial_component_packet";
import { ServerAdComponent } from "./server_ad_system";

export function constructEarth(em: ServerEntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  em.addEntity(id, EntityType.EARTH, []);

  return id;
}

export function constructSoil(em: ServerEntityManager, desc: any): EntityId {
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

  spatialSys.positionEntity(id, desc.col, desc.row);

  return id;
}

export function constructRock(em: ServerEntityManager, desc: any): EntityId {
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

  spatialSys.positionEntity(id, desc.col, desc.row);

  return id;
}

export function constructGem(em: ServerEntityManager, desc: any): EntityId {
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

  spatialSys.positionEntity(id, desc.col, desc.row);

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

function constructBlimp(em: ServerEntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  const freeModeProps: FreeModeProperties = {
    heavy: false,
    fixedAngle: false
  };

  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new ServerSpatialComponent(id,
                                                 spatialSys.grid,
                                                 DEFAULT_GRID_MODE_PROPS,
                                                 freeModeProps);

  spatialComp.currentMode = SpatialMode.FREE_MODE;

  em.addEntity(id, EntityType.BLIMP, [ spatialComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}

function constructAd(em: ServerEntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  const freeModeProps: FreeModeProperties = {
    heavy: false,
    fixedAngle: false
  };

  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new ServerSpatialComponent(id,
                                                 spatialSys.grid,
                                                 DEFAULT_GRID_MODE_PROPS,
                                                 freeModeProps);

  spatialComp.currentMode = SpatialMode.FREE_MODE;

  const adComp = new ServerAdComponent(id, desc.adName);

  em.addEntity(id, EntityType.AD, [ spatialComp, adComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}

export function constructEntity(em: ServerEntityManager, desc: EntityDesc) {
  switch (desc.type) {
    case EntityType.EARTH: {
      constructEarth(em, desc.data);
      break;
    }
    case EntityType.GEM: {
      constructGem(em, desc.data);
      break;
    }
    case EntityType.ROCK: {
      constructRock(em, desc.data);
      break;
    }
    case EntityType.SOIL: {
      constructSoil(em, desc.data);
      break;
    }
    case EntityType.BLIMP: {
      constructBlimp(em, desc.data);
      break;
    }
    case EntityType.AD: {
      constructAd(em, desc.data);
      break;
    }
  }
}
