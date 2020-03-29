import { EntityManager } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, CParallax } from "../render_system";
import { CSpatial } from "../spatial_component";
import { EntityType } from "../common/game_objects";

export function constructParallaxSprite(em: EntityManager, entity: EntityData) {
  const staticImages: StaticImage[] = [
    {
      name: entity.desc.image,
      width: entity.desc.width,
      height: entity.desc.height
    }
  ];

  const renderComp = new CParallax(entity.id,
                                   staticImages,
                                   [],
                                   entity.desc.image,
                                   entity.desc.depth);

  const spatialComp = new CSpatial(entity.id, em);

  em.addEntity(entity.id, EntityType.PARALLAX_SPRITE, [ spatialComp,
                                                        renderComp ]);

  const x = entity.desc.centre.x - 0.5 * entity.desc.width;
  const y = entity.desc.centre.y - 0.5 * entity.desc.height;

  spatialComp.setStaticPos(x, y);
}
