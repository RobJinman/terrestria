import _ from "underscore";
import { ComponentType } from "./common/component_types";
import { ServerEntityManager } from "./server_entity_manager";
import { BLOCK_SZ } from "./common/constants";
import { Span, Span2d } from "./common/span";
import { ServerSpatialSystem } from "./server_spatial_system";
import { AgentSystem } from "./agent_system";
import { BehaviourSystem } from "./common/behaviour_system";
import { InventorySystem } from "./inventory_system";
import { EntityType } from "./common/game_objects";
import { MapData, Span2dDesc, EntityDesc } from "./common/map_data";
import { constructEntity } from "./factory";
import { ServerAdSystem } from "./server_ad_system";

// TODO: This will come from JSON. For now, generate the data here
export function loadMapData(): MapData {
  const WORLD_W = 40;
  const WORLD_H = 25;

  const gravRegion: Span2dDesc = [
    [{ a: 0, b: WORLD_W - 1 }],
    [{ a: 0, b: WORLD_W - 1 }],
    [{ a: 0, b: WORLD_W - 1 }],
    [{ a: 0, b: WORLD_W - 1 }],
    [{ a: 0, b: WORLD_W - 1 }],
    [],
    [],
    [],
    [],
    [],
    [],
    [{ a: 6, b: 18 }],
    [{ a: 6, b: 18 }],
    [{ a: 6, b: 18 }],
    [{ a: 6, b: 18 }],
    [{ a: 6, b: 18 }],
  ];

  const entities: EntityDesc[] = [];

  const gr = constructGravRegion(gravRegion);
  const numRocks = 20;
  const numGems = 10;

  let coords: [number, number][] = [];
  for (let c = 0; c < WORLD_W; ++c) {
    for (let r = 0; r < WORLD_H; ++r) {
      if (c === 0 && r === WORLD_H - 1) {
        continue;
      }
      if (gr.contains(c, r)) {
        continue;
      }
      coords.push([c * BLOCK_SZ, r * BLOCK_SZ]);
    }
  }

  coords = _.shuffle(coords);

  let idx = 0;
  const rockCoords = coords.slice(0, numRocks);
  idx += numRocks;
  const gemCoords = coords.slice(idx, idx + numGems);
  idx += numGems;
  const soilCoords = coords.slice(idx);

  rockCoords.forEach(([c, r]) => {
    entities.push({
      type: EntityType.ROCK,
      data: {
        row: r,
        col: c
      }
    });
  });

  gemCoords.forEach(([c, r]) => {
    entities.push({
      type: EntityType.GEM,
      data: {
        row: r,
        col: c
      }
    });
  });

  soilCoords.forEach(([c, r]) => {
    entities.push({
      type: EntityType.SOIL,
      data: {
        row: r,
        col: c
      }
    });
  });

  entities.push({
    type: EntityType.BLIMP,
    data: {
      x: 20,
      y: 20
    }
  });

  entities.push({
    type: EntityType.AD,
    data: {
      x: 80,
      y: 40,
      adName: "blimp"
    }
  });

  return {
    width: WORLD_W,
    height: WORLD_H,
    gravityRegion: gravRegion,
    spawnPoint: { x: 0, y: WORLD_H - 1 },
    entities
  };
}

function constructGravRegion(desc: Span2dDesc) {
  const gravRegion = new Span2d();

  for (let row = 0; row < desc.length; ++row) {
    for (const spanDesc of desc[row]) {
      gravRegion.addHorizontalSpan(row, new Span(spanDesc.a, spanDesc.b));
    }
  }

  return gravRegion;
}

export function loadMap(em: ServerEntityManager, mapData: MapData) {
  const gravRegion = constructGravRegion(mapData.gravityRegion);

  const serverSpatialSystem = new ServerSpatialSystem(em,
                                                      mapData.width,
                                                      mapData.height,
                                                      gravRegion);
  const agentSystem = new AgentSystem(em);
  const behaviourSystem = new BehaviourSystem();
  const inventorySystem = new InventorySystem();
  const adSystem = new ServerAdSystem();

  em.addSystem(ComponentType.SPATIAL, serverSpatialSystem);
  em.addSystem(ComponentType.AGENT, agentSystem);
  em.addSystem(ComponentType.BEHAVIOUR, behaviourSystem);
  em.addSystem(ComponentType.INVENTORY, inventorySystem);
  em.addSystem(ComponentType.AD, adSystem);

  for (const entity of mapData.entities) {
    constructEntity(em, entity);
  }
}
