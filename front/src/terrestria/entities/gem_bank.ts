import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, CSprite } from "../render_system";
import { PLAYER_Z_INDEX } from "../constants";
import { CSpatial } from "../spatial_component";
import { EntityType } from "../common/game_objects";
import { BLOCK_SZ } from "../common/constants";
import { Vec2 } from "../common/geometry";

const ENTRANCE_OFFSET: Vec2 = { x: 1 * BLOCK_SZ, y: 1 * BLOCK_SZ };
const EXIT_OFFSET: Vec2 = { x: 3 * BLOCK_SZ, y: 1 * BLOCK_SZ };

export function constructGemBank(em: EntityManager, entity: EntityData) {
  const staticImages: StaticImage[] = [
    {
      name: "gem_bank.png"
    }
  ];

  const renderComp = new CSprite(entity.id,
                                 staticImages,
                                 [],
                                 "gem_bank.png",
                                 { zIndex: PLAYER_Z_INDEX + 1 });

  const spatialComp = new CSpatial(entity.id, em);

  em.addEntity(entity.id, EntityType.OTHER, [ spatialComp, renderComp ]);

  const entranceId = constructEntrance(em);
  const exitId = constructExit(em);

  em.addChildToEntity(entity.id, entranceId);
  em.addChildToEntity(entity.id, exitId);
}

function constructEntrance(em: EntityManager) {
  const id = getNextEntityId();

  const staticImages: StaticImage[] = [
    {
      name: "gem_bank_entrance.png"
    }
  ];

  const renderComp = new CSprite(id,
                                 staticImages,
                                 [],
                                 "gem_bank_entrance.png",
                                 { zIndex: PLAYER_Z_INDEX - 1 });

  const spatialComp = new CSpatial(id, em);

  em.addEntity(id, EntityType.OTHER, [ spatialComp, renderComp ]);

  spatialComp.setStaticPos(ENTRANCE_OFFSET.x, ENTRANCE_OFFSET.y);

  return id;
}

function constructExit(em: EntityManager) {
  const id = getNextEntityId();

  const staticImages: StaticImage[] = [
    {
      name: "gem_bank_exit.png"
    }
  ];

  const renderComp = new CSprite(id,
                                 staticImages,
                                 [],
                                 "gem_bank_exit.png",
                                 { zIndex: PLAYER_Z_INDEX - 1 });

  const spatialComp = new CSpatial(id, em);

  em.addEntity(id, EntityType.OTHER, [ spatialComp, renderComp ]);

  spatialComp.setStaticPos(EXIT_OFFSET.x, EXIT_OFFSET.y);

  return id;
}
