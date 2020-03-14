import { AgentComponent, AgentSystem } from "./agent_system";
import { EntityType } from "./common/game_objects";
import { GameEventType, EAgentEnterCell, EEntityBurned, EPlayerKilled, 
         EAwardGranted } from "./common/event";
import { BehaviourComponent, EventHandlerFn } from "./common/behaviour_system";
import { EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { InventorySystem, CCollector, CCollectable,
         Bucket } from "./inventory_system";
import { ServerEntityManager, getNextEntityId } from "./server_entity_manager";
import { ServerSpatialSystem } from "./server_spatial_system";
import { ServerSpatialComponent } from "./server_spatial_component";
import { Circle, Polygon, Rectangle } from "./common/geometry";
import { BLOCK_SZ } from "./common/constants";
import { EntityDesc } from "./common/map_data";
import { DEFAULT_GRID_MODE_PROPS } from "./grid_mode_properties";
import { FreeModeProperties } from "./free_mode_properties";
import { SpatialMode } from "./common/spatial_component_packet";
import { ServerAdComponent } from "./server_ad_system";
import { GameError } from "./common/error";
import { CreateAwardResult } from "./pinata";

function constructEarth(em: ServerEntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  em.addEntity(id, EntityType.EARTH, desc, []);

  return id;
}

function constructSoil(em: ServerEntityManager, desc: any): EntityId {
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

  em.addEntity(id, EntityType.SOIL, desc, [ spatialComp, behaviourComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}

function constructRock(em: ServerEntityManager, desc: any): EntityId {
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

  em.addEntity(id, EntityType.ROCK, desc, [ spatialComp, behaviourComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}

function constructGem(em: ServerEntityManager, desc: any): EntityId {
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

  em.addEntity(id, EntityType.GEM, desc, [ spatialComp,
                                           invComp,
                                           behaviourComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}

function constructPlayer(em: ServerEntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  const agentComp = new AgentComponent(id, desc.pinataId, desc.pinataToken);

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
  invComp.addBucket(new Bucket("trophies", -1));

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

  em.addEntity(id, EntityType.PLAYER, {}, [ spatialComp,
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

  em.addEntity(id, EntityType.BLIMP, desc, [ spatialComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}

function constructTrophy(em: ServerEntityManager,
                         desc: any): EntityId {
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

  em.addEntity(id, EntityType.AD, desc, [ spatialComp, adComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  return id;
}

function constructParallaxSprite(em: ServerEntityManager, desc: any) {
  const id = getNextEntityId();

  em.addEntity(id, EntityType.PARALLAX_SPRITE, desc, []);

  return id;
}

export class ServerEntityFactory {
  private _em: ServerEntityManager;

  constructor(em: ServerEntityManager) {
    this._em = em;
  }

  constructEntity(desc: EntityDesc): EntityId {
    switch (desc.type) {
      case EntityType.PLAYER: {
        return constructPlayer(this._em, desc.data);
      }
      case EntityType.EARTH: {
        return constructEarth(this._em, desc.data);
      }
      case EntityType.GEM: {
        return constructGem(this._em, desc.data);
      }
      case EntityType.ROCK: {
        return constructRock(this._em, desc.data);
      }
      case EntityType.SOIL: {
        return constructSoil(this._em, desc.data);
      }
      case EntityType.BLIMP: {
        return constructBlimp(this._em, desc.data);
      }
      case EntityType.TROPHY: {
        return constructTrophy(this._em, desc.data);
      }
      case EntityType.AD: {
        return constructAd(this._em, desc.data);
      }
      case EntityType.PARALLAX_SPRITE: {
        return constructParallaxSprite(this._em, desc.data);
      }
    }

    throw new GameError(`No factory function for type ${desc.type}`);
  }
}
