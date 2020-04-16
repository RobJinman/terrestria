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
import { constructEarth } from "./entities/scenery";
import { constructAwardNotification } from "./entities/awards";
import { constructGemBundle } from "./entities/gem_bundle";
import { constructSfx } from "./entities/sfx";
import { AudioManager } from "./audio_manager";
import { Scheduler } from "./common/scheduler";
import { constructDestructableWall, constructMetalWall } from "./entities/wall";
import { constructHud } from "./entities/hud";
import { constructBillboardL, constructBillboardR } from "./entities/billboard";
import { constructGameOverNotification } from "./entities/game_over";
import { RenderSystem } from "./render_system";

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
      case EntityType.WALL: {
        constructDestructableWall(entityManager, entity);
        break;
      }
      case EntityType.METAL_WALL: {
        constructMetalWall(entityManager, entity);
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
      case EntityType.BILLBOARD_L: {
        constructBillboardL(entityManager, entity);
        break;
      }
      case EntityType.BILLBOARD_R: {
        constructBillboardR(entityManager, entity);
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
                                                    scheduler: Scheduler,
                                                    mapData: ClientMapData) {
  const inventorySys = <InventorySystem>em.getSystem(ComponentType.INVENTORY);
  inventorySys.setDisplayedBucket("gems");

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);
  renderSys.setBackground("sky.png");

  constructEarth(em, mapData);
  constructAwardNotification(em, scheduler);
  constructSfx(em, audioManager, scheduler);
  constructHud(em);
  constructGameOverNotification(em, scheduler);
}
