import { EntityManager } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, CSprite } from "../render_system";
import { CSpatial } from "../spatial_component";
import { EntityType } from "../common/game_objects";

export function constructBillboard(em: EntityManager, entity: EntityData) {
  const staticImages: StaticImage[] = [
    {
      name: "billboard.png"
    }
  ];

  const renderComp = new CSprite(entity.id,
                                 staticImages,
                                 [],
                                 "billboard.png");

  const spatialComp = new CSpatial(entity.id, em);

  em.addEntity(entity.id, EntityType.BILLBOARD, [ spatialComp, renderComp ]);  
}
