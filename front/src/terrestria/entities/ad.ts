import { EntityManager } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, CSprite } from "../render_system";
import { CSpatial } from "../spatial_component";
import { CAdvert } from "../advert_system";
import { EntityType } from "../common/game_objects";

export function constructAd(em: EntityManager, entity: EntityData) {
  const staticImages: StaticImage[] = [
    {
      name: "blimp_ad_placeholder.png"
    }
  ];

  const renderComp = new CSprite(entity.id,
                                 staticImages,
                                 [],
                                 "blimp_ad_placeholder.png");

  const spatialComp = new CSpatial(entity.id, em);

  const adComp = new CAdvert(entity.id);

  em.addEntity(entity.id, EntityType.OTHER, [ spatialComp,
                                              renderComp,
                                              adComp ]);
}
