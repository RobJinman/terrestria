import _ from "underscore";
import { ComponentType } from "./common/component_types";
import { EntityManager } from "./entity_manager";
import { BLOCK_SZ } from "./common/constants";
import { Span, Span2d } from "./common/span";
import { SpatialSystem } from "./spatial_system";
import { AgentSystem } from "./agent_system";
import { BehaviourSystem } from "./common/behaviour_system";
import { InventorySystem } from "./inventory_system";
import { EntityType } from "./common/game_objects";
import { MapData, Span2dDesc, EntityDesc } from "./common/map_data";
import { EntityFactory } from "./entity_factory";
import { Pinata } from "./pinata";
import { Logger } from "./logger";
import { Pipe } from "./pipe";
import * as map0 from "./maps/map0.json";
import { addToMapOfArrays } from "./common/utils";

interface MapBuilderEntity {
  type: EntityType;
  clearSpace: {
    y: number;
    span2d: Span2dDesc;
  };
  data: any;
}

export class MapLoader {
  private _em: EntityManager;
  private _pinata: Pinata;
  private _factory: EntityFactory;
  private _pipe: Pipe;
  private _logger: Logger;
  private _mapData: MapData|null = null;

  constructor(em: EntityManager,
              pinata: Pinata,
              factory: EntityFactory,
              pipe: Pipe,
              logger: Logger) {
    this._em = em;
    this._pinata = pinata;
    this._factory = factory;
    this._pipe = pipe;
    this._logger = logger;
  }

  loadMap(pinata: Pinata) {
    this._mapData = this._loadMapData();

    const gravRegion = this._constructSpan2d(this._mapData.gravityRegion);

    const spatialSystem = new SpatialSystem(this._em,
                                            this._mapData.width,
                                            this._mapData.height,
                                            gravRegion,
                                            this._logger);
    const agentSystem = new AgentSystem(this._em,
                                        this._factory,
                                        this._pipe,
                                        this._pinata,
                                        this._logger);
    const behaviourSystem = new BehaviourSystem();
    const inventorySystem = new InventorySystem();

    this._em.addSystem(ComponentType.SPATIAL, spatialSystem);
    this._em.addSystem(ComponentType.AGENT, agentSystem);
    this._em.addSystem(ComponentType.BEHAVIOUR, behaviourSystem);
    this._em.addSystem(ComponentType.INVENTORY, inventorySystem);

    this._factory.setMapData(this._mapData);

    for (const entity of this._mapData.entities) {
      this._factory.constructEntity(entity);
    }
  }

  get mapData() {
    return this._mapData;
  }

  private _loadMapData(): MapData {
    const digRegion = this._constructSpan2d(map0.digRegion);
    const mapItems = <MapBuilderEntity[]>map0.items;

    const entities: EntityDesc[] = [];

    const mask = new Span2d();
    for (const item of mapItems) {
      entities.push(item);

      const clear = item.clearSpace;
      if (clear) {
        for (let j = 0; j < clear.span2d.length; ++j) {
          const y = clear.y + j;
          const row = clear.span2d[j];

          for (const span of row) {
            addToMapOfArrays(mask.spans, y, new Span(span.a, span.b));
          }
        }
      }
    }

    let coords: [ number, number ][] = [];
    for (const { x, y } of digRegion) {
      if (!mask.contains(x, y)) {
        coords.push([ x, y ]);
      }
    }

    coords = _.shuffle(coords);

    let idx = 0;
    const roundRockCoords = coords.slice(0, map0.numRoundRocks);
    idx += map0.numRoundRocks;
    const squareRockCoords = coords.slice(idx, idx + map0.numSquareRocks);
    idx += map0.numSquareRocks;
    const gemCoords = coords.slice(idx, idx + map0.numGems);
    idx += map0.numGems;
    const soilCoords = coords.slice(idx);

    roundRockCoords.forEach(([c, r]) => {
      entities.push({
        type: EntityType.ROUND_ROCK,
        data: {
          y: r * BLOCK_SZ,
          x: c * BLOCK_SZ
        }
      });
    });

    squareRockCoords.forEach(([c, r]) => {
      entities.push({
        type: EntityType.SQUARE_ROCK,
        data: {
          y: r * BLOCK_SZ,
          x: c * BLOCK_SZ
        }
      });
    });

    gemCoords.forEach(([c, r]) => {
      entities.push({
        type: EntityType.GEM,
        data: {
          y: r * BLOCK_SZ,
          x: c * BLOCK_SZ
        }
      });
    });

    soilCoords.forEach(([c, r]) => {
      entities.push({
        type: EntityType.SOIL,
        data: {
          x: c * BLOCK_SZ,
          y: r * BLOCK_SZ
        }
      });
    });

    return {
      width: map0.width,
      height: map0.height,
      gravityRegion: map0.gravRegion,
      spawnPoints: map0.spawnPoints,
      entities
    };
  }

  private _constructSpan2d(desc: Span2dDesc) {
    const span2d = new Span2d();

    for (let row = 0; row < desc.length; ++row) {
      for (const spanDesc of desc[row]) {
        span2d.addHorizontalSpan(row, new Span(spanDesc.a, spanDesc.b));
      }
    }

    return span2d;
  }
}
