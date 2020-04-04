import { RNewEntities, ClientMapData } from "./common/response";
import { EntityType } from "./common/game_objects";
import { ComponentType } from "./common/component_types";
import { EntityManager } from "./entity_manager";
import { InventorySystem } from "./inventory_system";
import { constructPlayer } from "./entities/player";
import { constructGem } from "./entities/gem";
import { constructRoundRock, constructSquareRock } from "./entities/rock";
import { constructSoil } from "./entities/soil";
import { constructBlimp } from "./entities/blimp";
import { constructTrophy } from "./entities/trophy";
import { constructAd } from "./entities/ad";
import { constructParallaxSprite } from "./entities/parallax_sprite";
import { constructGemBank } from "./entities/gem_bank";
import { constructEarth, constructSky } from "./entities/scenery";
import { constructAwardNotification } from "./entities/awards";
import { constructGemBundle } from "./entities/gem_bundle";
import { constructSfx } from "./entities/sfx";
import { AudioManager } from "./audio_manager";

export function constructEntities(entityManager: EntityManager,
                                  mapData: ClientMapData,
                                  response: RNewEntities) {
  response.entities.forEach(entity => {
    switch (entity.type) {
      case EntityType.PLAYER: {
        constructPlayer(entityManager, entity);
        break;
      }
      case EntityType.GEM: {
        constructGem(entityManager, entity);
        break;
      }
      case EntityType.GEM_BUNDLE: {
        constructGemBundle(entityManager, entity);
        break;
      }
      case EntityType.ROUND_ROCK: {
        constructRoundRock(entityManager, entity);
        break;
      }
      case EntityType.SQUARE_ROCK: {
        constructSquareRock(entityManager, entity);
        break;
      }
      case EntityType.SOIL: {
        constructSoil(entityManager, entity);
        break;
      }
      case EntityType.BLIMP: {
        constructBlimp(entityManager, entity);
        break;
      }
      case EntityType.TROPHY: {
        constructTrophy(entityManager, entity);
        break;
      }
      case EntityType.AD: {
        constructAd(entityManager, entity);
        break;
      }
      case EntityType.PARALLAX_SPRITE: {
        constructParallaxSprite(entityManager, entity);
        break;
      }
      case EntityType.GEM_BANK: {
        constructGemBank(entityManager, entity);
        break;
      }
    }
  });
}

// Construct any client-side only entities from map data
export function constructInitialEntitiesFromMapData(em: EntityManager,
                                                    audioManager: AudioManager,
                                                    mapData: ClientMapData) {
  const inventorySys = <InventorySystem>em.getSystem(ComponentType.INVENTORY);
  inventorySys.setDisplayedBucket("gems");

  constructEarth(em, mapData);
  constructSky(em, mapData);
  constructAwardNotification(em);
  constructSfx(em, audioManager);
}
