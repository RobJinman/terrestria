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

  const entryId = constructEntry(em, desc.x, desc.y + BLOCK_SZ * 2.5);
  const exitId = constructExit(em, id);

  em.addChildToEntity(id, entryId);

  return id;
}

function constructEntry(em: EntityManager,
                        x: number,
                        y: number) {
  const id = getNextEntityId();

  const gridModeProps = {
    solid: false,
    blocking: false,
    stackable: false,
    squashable: false,
    heavy: false,
    movable: false,
    isAgent: false
  };

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  const spatialComp = new CSpatial(id,
                                   true,
                                   spatialSys.grid,
                                   gridModeProps,
                                   DEFAULT_FREE_MODE_PROPS);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_ENTER_CELL,
                     e => onAgentEnter(em, <EAgentEnterCell>e));

  const behaviourComp = new CBehaviour(id, targetedEvents);

  em.addEntity(id, EntityType.OTHER, {}, [ spatialComp, behaviourComp ]);

  spatialSys.positionEntity(id, x, y);

  return id;
}

function constructExit(em: EntityManager, parentId: EntityId) {

}

function onAgentEnter(em: EntityManager, event: EAgentEnterCell) {
  console.log(`Entity ${event.entityId} enters gem bank`);
}
