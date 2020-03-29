import { EntityManager } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, CSprite } from "../render_system";
import { CSpatial } from "../spatial_component";
import { EntityType } from "../common/game_objects";

export function constructBlimp(em: EntityManager, entity: EntityData) {
  const staticImages: StaticImage[] = [
    {
      name: "blimp.png"
    }
  ];

  const renderComp = new CSprite(entity.id,
                                 staticImages,
                                 [],
                                 "blimp.png");

  const spatialComp = new CSpatial(entity.id, em);

  em.addEntity(entity.id, EntityType.OTHER, [ spatialComp, renderComp ]);  
}
