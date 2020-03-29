import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityId } from "../common/system";
import { FreeModeProperties,
         DEFAULT_FREE_MODE_PROPS } from "../free_mode_properties";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";
import { CSpatial } from "../spatial_component";
import { DEFAULT_GRID_MODE_PROPS,
         GridModeProperties } from "../grid_mode_properties";
import { EntityType } from "../common/game_objects";
import { CBehaviour, EventHandlerFn } from "../common/behaviour_system";
import { GameEventType, EAgentEnterCell } from "../common/event";
import { BLOCK_SZ } from "../common/constants";
import { CCollector } from "../inventory_system";

export function constructGemBank(em: EntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  const freeModeProps: FreeModeProperties = {
    heavy: false,
    fixedAngle: false
  };

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   false,
                                   spatialSys.grid,
                                   DEFAULT_GRID_MODE_PROPS,
                                   freeModeProps);

  em.addEntity(id, EntityType.GEM_BANK, desc, [ spatialComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  const exitId = constructExit(em, id);
  constructEntrance(em, id, exitId);
  constructBlockingSpaces(em, id);

  return id;
}

function constructBlockingSpaces(em: EntityManager, parentId: EntityId) {
  const coords = [
    [ 0, 1 ], [ 1, 1 ], [ 2, 1 ], [ 3, 1 ],
    [ 0, 2 ], [ 1, 2 ], [ 2, 2 ], [ 3, 2 ],
              [ 1, 3 ], [ 2, 3 ], [ 3, 3 ]
  ];

  for (const [ i, j ] of coords) {
    const id = getNextEntityId();

    const gridModeProps: GridModeProperties = {
      solid: true,
      blocking: true,
      heavy: false,
      movable: false,
      stackable: false,
      squashable: false,
      isAgent: false
    };

    const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

    const spatialComp = new CSpatial(id,
                                     true,
                                     spatialSys.grid,
                                     gridModeProps,
                                     DEFAULT_FREE_MODE_PROPS);

    em.addEntity(id, EntityType.OTHER, {}, [ spatialComp ]);
    em.addChildToEntity(parentId, id);

    spatialComp.setStaticPos(i * BLOCK_SZ, j * BLOCK_SZ);
  }
}

function constructEntrance(em: EntityManager,
                           parentId: EntityId,
                           exitId: EntityId) {
  const id = getNextEntityId();

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   true,
                                   spatialSys.grid,
                                   DEFAULT_GRID_MODE_PROPS,
                                   DEFAULT_FREE_MODE_PROPS);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_ENTER_CELL,
                     e => onAgentEnter(em, exitId, <EAgentEnterCell>e));

  const behaviourComp = new CBehaviour(id, targetedEvents);

  em.addEntity(id, EntityType.OTHER, {}, [ spatialComp, behaviourComp ]);
  em.addChildToEntity(parentId, id);

  spatialSys.positionEntity(id, 0, BLOCK_SZ * 3);
}

function constructExit(em: EntityManager, parentId: EntityId) {
  const id = getNextEntityId();

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   true,
                                   spatialSys.grid,
                                   DEFAULT_GRID_MODE_PROPS,
                                   DEFAULT_FREE_MODE_PROPS);

  em.addEntity(id, EntityType.OTHER, {}, [ spatialComp ]);
  em.addChildToEntity(parentId, id);

  spatialSys.positionEntity(id, BLOCK_SZ * 4, BLOCK_SZ * 3);

  return id;
}

function onAgentEnter(em: EntityManager,
                      exitId: EntityId,
                      event: EAgentEnterCell) {
  const collector = <CCollector>em.getComponent(ComponentType.INVENTORY,
                                                event.entityId);
  const collected = collector.bucketValue("gems");
  if (collected > 0) {
    collector.clearBucket("gems");

    const agentSpatial = <CSpatial>em.getComponent(ComponentType.SPATIAL,
                                                   event.entityId);
    const exitSpatial = <CSpatial>em.getComponent(ComponentType.SPATIAL,
                                                  exitId);

    agentSpatial.gridMode.stop();
    agentSpatial.gridMode.moveToPos(exitSpatial.x, exitSpatial.y, 0.1);

    console.log(`${collected} gems banked!`);
  }
}
