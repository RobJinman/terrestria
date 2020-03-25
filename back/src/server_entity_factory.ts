import { EntityType } from "./common/game_objects";
import { EntityId } from "./common/system";
import { ServerEntityManager, getNextEntityId } from "./server_entity_manager";
import { EntityDesc } from "./common/map_data";
import { GameError } from "./common/error";
import { constructPlayer } from "./entities/player";
import { constructGem } from "./entities/gem";
import { constructRock } from "./entities/rock";
import { constructSoil } from "./entities/soil";
import { constructBlimp } from "./entities/blimp";
import { constructTrophy } from "./entities/trophy";
import { constructAd } from "./entities/ad";

function constructEarth(em: ServerEntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  em.addEntity(id, EntityType.EARTH, desc, []);

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
