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
import { BLOCK_SZ, PLAYER_SPEED } from "../common/constants";
import { CCollector } from "../inventory_system";
import { Scheduler } from "../common/scheduler";

const GEM_BANK_OFFSET = [ 1, 0 ];
const GEM_BANK_SIZE = [ 3, 3 ];   // Assumes rectangular
const ENTRANCE_POS = [ 1, 1 ];
const EXIT_POS = [ 3, 1 ];
const GEM_DEPOSIT_DURATION = 0.5;

export function constructGemBank(em: EntityManager,
                                 desc: any,
                                 scheduler: Scheduler): EntityId {
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
  constructEntrance(em, scheduler, id, exitId);
  constructBlockingSpaces(em, id);

  return id;
}

function constructBlockingSpaces(em: EntityManager, parentId: EntityId) {
  const coords: [number, number][] = [];
  for (let i = 0; i < GEM_BANK_SIZE[0]; ++i) {
    for (let j = 0; j < GEM_BANK_SIZE[1]; ++j) {
      const x = i + GEM_BANK_OFFSET[0];
      const y = j + GEM_BANK_OFFSET[1];

      if (x == ENTRANCE_POS[0] && y == ENTRANCE_POS[1]) {
        continue;
      }
      if (x == EXIT_POS[0] && y == EXIT_POS[1]) {
        continue;
      }

      coords.push([ x, y ]);
    }
  }

  for (const [ i, j ] of coords) {
    const id = getNextEntityId();

    const gridModeProps: GridModeProperties = {
      solid: true,
      blocking: true,
      heavy: false,
      movable: false,
      stackable: true,
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
                           scheduler: Scheduler,
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
                     e => onAgentEnter(em,
                                       scheduler,
                                       exitId,
                                       <EAgentEnterCell>e));

  const behaviourComp = new CBehaviour(id, targetedEvents);

  em.addEntity(id, EntityType.OTHER, {}, [ spatialComp, behaviourComp ]);
  em.addChildToEntity(parentId, id);

  spatialSys.positionEntity(id, ENTRANCE_POS[0] * BLOCK_SZ,
                                ENTRANCE_POS[1] * BLOCK_SZ);
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

  spatialSys.positionEntity(id, EXIT_POS[0] * BLOCK_SZ, EXIT_POS[1] * BLOCK_SZ);

  return id;
}

function onAgentEnter(em: EntityManager,
                      scheduler: Scheduler,
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

    scheduler.addFunction(() => {
      agentSpatial.gridMode.stop();
      agentSpatial.gridMode.moveToPos(exitSpatial.x,
                                      exitSpatial.y,
                                      GEM_DEPOSIT_DURATION);

      console.log(`${collected} gems banked!`);
    }, 1000.0 / PLAYER_SPEED);
  }
}
