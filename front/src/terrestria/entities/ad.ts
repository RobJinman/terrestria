import { EntityManager } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, CSprite, CParallax,
         RenderOptions } from "../render_system";
import { CSpatial } from "../spatial_component";
import { CAdvert } from "../advert_system";
import { EntityType } from "../common/game_objects";
import { GameError } from "../common/error";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";

export function constructAd(em: EntityManager, entity: EntityData) {
  const adName = entity.desc.adName;

  if (adName == "blimp") {
    constructBlimpAd(em, entity);
  }
  else if (adName == "billboard") {
    constructBillboardAd(em, entity);
  }
  else {
    throw new GameError(`Don't know how to construct ad with name ${adName}`);
  }
}

function constructBlimpAd(em: EntityManager, entity: EntityData) {
  const staticImages: StaticImage[] = [
    {
      name: `blimp_ad_placeholder.png`
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

function constructBillboardAd(em: EntityManager, entity: EntityData) {
  const image = "billboard_ad_placeholder.png";
  const width = 302;
  const height = 181;
  const depth = 1;
  const x = entity.desc.x;
  const y = entity.desc.y;

  const staticImages: StaticImage[] = [
    {
      name: image,
      width,
      height
    }
  ];

  const opts: RenderOptions = {
    zIndex: 2,
    // Position is slightly off for some reason, so tweak it here
    offset: { x: -2, y: -2 }
  };

  const renderComp = new CParallax(entity.id,
                                   staticImages,
                                   [],
                                   image,
                                   depth,
                                   opts);

  const spatialComp = new CSpatial(entity.id, em);

  const adComp = new CAdvert(entity.id);

  em.addEntity(entity.id, EntityType.PARALLAX_SPRITE, [ spatialComp,
                                                        renderComp,
                                                        adComp ]);

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);
  spatialSys.setStaticPos(entity.id, x, y);
}
