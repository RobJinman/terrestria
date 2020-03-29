import { EntityManager, getNextEntityId } from "../entity_manager";
import { ClientMapData } from "../common/response";
import { Span2d } from "../common/span";
import { StaticImage, CTiledRegion, Colour, CShape } from "../render_system";
import { EntityType } from "../common/game_objects";
import { BLOCK_SZ } from "../common/constants";
import { CSpatial } from "../spatial_component";
import { Rectangle } from "../common/geometry";

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
                                      "earth.png");

  em.addEntity(id, EntityType.EARTH, [ renderComp ]);
}

export function constructSky(em: EntityManager, mapData: ClientMapData) {
  const id = getNextEntityId();

  const shape = new Rectangle(mapData.width * BLOCK_SZ, 5 * BLOCK_SZ);
  const colour = new Colour(0.5, 0.5, 0.99);

  const renderComp = new CShape(id, shape, colour);

  const spatialComp = new CSpatial(id, em);

  em.addEntity(id, EntityType.OTHER, [ spatialComp, renderComp ]);

  spatialComp.setStaticPos(0, 0);
}
