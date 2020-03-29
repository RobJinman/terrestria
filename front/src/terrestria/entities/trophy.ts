import { EntityManager } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, CSprite } from "../render_system";
import { CSpatial } from "../spatial_component";
import { EntityType } from "../common/game_objects";

export function constructTrophy(em: EntityManager, entity: EntityData) {
  const id = entity.id;

  const staticImages: StaticImage[] = [
    {
      name: "trophy.png"
    }
  ];

  const renderComp = new CSprite(id,
                                 staticImages,
                                 [],
                                 "trophy.png");

  const spatialComp = new CSpatial(id, em);

  em.addEntity(id, EntityType.TROPHY, [ spatialComp,
                                        renderComp ]);
}
