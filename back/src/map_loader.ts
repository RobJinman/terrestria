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
import { AdvertSystem } from "./advert_system";
import { Pinata } from "./pinata";
import { Logger } from "./logger";
import { Pipe } from "./pipe";
import * as map0 from "./maps/map0.json";

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
    const adSystem = new AdvertSystem(pinata);

    this._em.addSystem(ComponentType.SPATIAL, spatialSystem);
    this._em.addSystem(ComponentType.AGENT, agentSystem);
    this._em.addSystem(ComponentType.BEHAVIOUR, behaviourSystem);
    this._em.addSystem(ComponentType.INVENTORY, inventorySystem);
    this._em.addSystem(ComponentType.AD, adSystem);

    for (const entity of this._mapData.entities) {
      this._factory.constructEntity(entity);
    }
  }

  get mapData() {
    return this._mapData;
  }

  private _loadMapData(): MapData {
    const digRegion = this._constructSpan2d(map0.digRegion);
    const entities: EntityDesc[] = [];

    for (const item of map0.items) {
      entities.push(<EntityDesc>item);
    }
/*
    for (const { x, y } of digRegion) {
      entities.push({
        type: EntityType.SOIL,
        data: {
          x: x * BLOCK_SZ,
          y: y * BLOCK_SZ
        }
      });
    }*/

    return {
      width: map0.width,
      height: map0.height,
      gravityRegion: map0.gravRegion,
      spawnPoint: { x: 0, y: map0.height - 1 },
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
