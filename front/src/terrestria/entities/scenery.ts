import { EntityManager, getNextEntityId } from "../entity_manager";
import { ClientMapData } from "../common/response";
import { Span2d } from "../common/span";
import { StaticImage, CTiledRegion } from "../render_system";
import { EntityType } from "../common/game_objects";

export function constructEarth(em: EntityManager, mapData: ClientMapData) {
  const id = getNextEntityId();

  const gravRegion = Span2d.fromDesc(mapData.gravityRegion);
  const digRegion = Span2d.inverse(gravRegion,
                                   mapData.width - 1,
                                   mapData.height - 1);

  const images: StaticImage[] = [
    {
      name: "earth.png"
    }
  ];

  const renderComp = new CTiledRegion(id,
                                      digRegion,
                                      images,
                                      "earth.png",
                                      { zIndex: -1 });

  em.addEntity(id, EntityType.EARTH, [ renderComp ]);
}
