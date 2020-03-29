import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityId } from "../common/system";
import { FreeModeProperties,
         DEFAULT_FREE_MODE_PROPS } from "../free_mode_properties";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";
import { CSpatial } from "../spatial_component";
import { DEFAULT_GRID_MODE_PROPS } from "../grid_mode_properties";
import { EntityType } from "../common/game_objects";
import { CBehaviour, EventHandlerFn } from "../common/behaviour_system";
import { GameEventType, EAgentEnterCell } from "../common/event";
import { BLOCK_SZ } from "../common/constants";
import { SpatialMode } from "../common/spatial_packet";
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

  spatialComp.currentMode = SpatialMode.FREE_MODE;

  em.addEntity(id, EntityType.GEM_BANK, desc, [ spatialComp ]);

  spatialSys.positionEntity(id, desc.x, desc.y);

  const entranceX = desc.x;
  const entranceY = desc.y + BLOCK_SZ * 2.5;
  const exitX = entranceX + BLOCK_SZ * 3;
  const exitY = entranceY;

  const exitId = constructExit(em, exitX, exitY);
  const entranceId = constructEntrance(em, exitId, entranceX, entranceY);

  em.addChildToEntity(id, entranceId);
  em.addChildToEntity(id, exitId);

  return id;
}

function constructEntrance(em: EntityManager,
                           exitId: EntityId,
                           x: number,
                           y: number) {
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

  spatialSys.positionEntity(id, x, y);

  return id;
}

function constructExit(em: EntityManager, x: number, y: number) {
  const id = getNextEntityId();

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   true,
                                   spatialSys.grid,
                                   DEFAULT_GRID_MODE_PROPS,
                                   DEFAULT_FREE_MODE_PROPS);

  em.addEntity(id, EntityType.OTHER, {}, [ spatialComp ]);

  spatialSys.positionEntity(id, x, y);

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

    agentSpatial.setStaticPos(exitSpatial.x, exitSpatial.y);

    console.log(`${collected} gems banked!`);
  }
}
