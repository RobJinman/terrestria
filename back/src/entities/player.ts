import { ServerEntityManager, getNextEntityId } from "../server_entity_manager";
import { EntityId } from "../common/system";
import { AgentComponent } from "../agent_system";
import { Circle } from "../common/geometry";
import { BLOCK_SZ } from "../common/constants";
import { ServerSpatialSystem } from "../server_spatial_system";
import { ComponentType } from "../common/component_types";
import { ServerSpatialComponent } from "../server_spatial_component";
import { CCollector, Bucket } from "../inventory_system";
import { GameEventType, EEntityBurned, EPlayerKilled } from "../common/event";
import { EventHandlerFn, BehaviourComponent } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";

export function constructPlayer(em: ServerEntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  const agentComp = new AgentComponent(id, desc.pinataId, desc.pinataToken);

  const gridModeProps = {
    solid: true,
    blocking: false,
    stackable: true,
    squashable: true,
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
  targetedEvents.set(GameEventType.ENTITY_SQUASHED,
                     e => onPlayerSquashed(em, id));

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.PLAYER, {}, [ spatialComp,
                                            agentComp,
                                            invComp,
                                            behaviourComp ]);

  return id;
}

function onPlayerSquashed(em: ServerEntityManager, playerId: EntityId) {
  const spatialSys = <ServerSpatialSystem>em.getSystem(ComponentType.SPATIAL);
  const spatialComp = spatialSys.getComponent(playerId);

  const gridX = spatialComp.gridMode.gridX;
  const gridY = spatialComp.gridMode.gridY;

  const entities = spatialSys.grid.idsInCells(gridX - 1,
                                              gridX + 1,
                                              gridY - 1,
                                              gridY + 1);

  entities.splice(entities.indexOf(playerId), 1);

  const burned: EEntityBurned = {
    type: GameEventType.ENTITY_BURNED,
    entities
  };

  const killed: EPlayerKilled = {
    type: GameEventType.PLAYER_KILLED,
    entities: [playerId],
    playerId
  };

  em.submitEvent(burned);
  em.submitEvent(killed);
}
