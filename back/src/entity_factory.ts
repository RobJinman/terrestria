import { EntityType } from "./common/game_objects";
import { EntityId } from "./common/system";
import { EntityManager, getNextEntityId } from "./entity_manager";
import { EntityDesc, MapData } from "./common/map_data";
import { GameError } from "./common/error";
import { constructPlayer } from "./entities/player";
import { constructGem } from "./entities/gem";
import { constructRoundRock, constructSquareRock } from "./entities/rock";
import { constructSoil } from "./entities/soil";
import { constructBlimp } from "./entities/blimp";
import { constructTrophy } from "./entities/trophy";
import { constructAd } from "./entities/advert";
import { constructGemBank } from "./entities/gem_bank";
import { Scheduler } from "./common/scheduler";
import { constructGemBundle } from "./entities/gem_bundle";
import { constructDestructableWall, constructMetalWall } from "./entities/wall";
import { constructRespawnArea } from "./entities/respawn_area";
import { constructBillboard } from "./entities/billboard";

function constructEarth(em: EntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  em.addEntity(id, EntityType.EARTH, desc, []);

  return id;
}

function constructParallaxSprite(em: EntityManager, desc: any) {
  const id = getNextEntityId();

  em.addEntity(id, EntityType.PARALLAX_SPRITE, desc, []);

  return id;
}

export class EntityFactory {
  private _em: EntityManager;
  private _scheduler: Scheduler;
  private _mapData?: MapData;

  constructor(em: EntityManager, scheduler: Scheduler) {
    this._em = em;
    this._scheduler = scheduler;
  }

  setMapData(mapData: MapData) {
    this._mapData = mapData;
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
      case EntityType.GEM_BUNDLE: {
        return constructGemBundle(this._em, desc.data);
      }
      case EntityType.ROUND_ROCK: {
        return constructRoundRock(this._em, desc.data);
      }
      case EntityType.SQUARE_ROCK: {
        return constructSquareRock(this._em, desc.data);
      }
      case EntityType.WALL: {
        return constructDestructableWall(this._em, desc.data);
      }
      case EntityType.METAL_WALL: {
        return constructMetalWall(this._em, desc.data);
      }
      case EntityType.SOIL: {
        return constructSoil(this._em, desc.data);
      }
      case EntityType.BLIMP: {
        if (!this._mapData) {
          throw new GameError("Blimp cannot be constructed without map data");
        }

        return constructBlimp(this._em,
                              desc.data,
                              this._scheduler,
                              this._mapData.width);
      }
      case EntityType.BILLBOARD: {
        return constructBillboard(this._em, desc.data);
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
      case EntityType.GEM_BANK: {
        return constructGemBank(this._em, desc.data, this._scheduler);
      }
      case EntityType.RESPAWN_AREA: {
        return constructRespawnArea(this._em, desc.data);
      }
    }

    throw new GameError(`No factory function for type ${desc.type}`);
  }
}
