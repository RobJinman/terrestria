import { EntityManager } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, CSprite, CParallax } from "../render_system";
import { CSpatial } from "../spatial_component";
import { EntityType } from "../common/game_objects";

export function constructBlimp(em: EntityManager, entity: EntityData) {
  const staticImages: StaticImage[] = [
    {
      name: "blimp.png"
    }
  ];

  const renderComp = new CParallax(entity.id,
                                   staticImages,
                                   [],
                                   "blimp.png",
                                   4);

  const spatialComp = new CSpatial(entity.id, em);

  em.addEntity(entity.id, EntityType.BLIMP, [ spatialComp, renderComp ]);  
}
