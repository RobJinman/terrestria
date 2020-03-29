import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, CSprite } from "../render_system";
import { PLAYER_Z_INDEX } from "../constants";
import { CSpatial } from "../spatial_component";
import { EntityType } from "../common/game_objects";
import { BLOCK_SZ } from "../common/constants";

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
  em.addChildToEntity(entity.id, entranceId);
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

  spatialComp.setStaticPos(0, BLOCK_SZ * 3);

  return id;
}
