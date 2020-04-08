import { EntityManager } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, CParallax, RenderOptions } from "../render_system";
import { CSpatial } from "../spatial_component";
import { EntityType } from "../common/game_objects";
import { SpatialSystem } from "../spatial_system";
import { ComponentType } from "../common/component_types";

export function constructBillboardL(em: EntityManager, entity: EntityData) {
  constructBillboard(em, entity, EntityType.BILLBOARD_L);
}

export function constructBillboardR(em: EntityManager, entity: EntityData) {
  constructBillboard(em, entity, EntityType.BILLBOARD_R);
}

function constructBillboard(em: EntityManager,
                            entity: EntityData,
                            type: EntityType) {
  const typeStr = type == EntityType.BILLBOARD_L ? "left" : "right";
  const xOffset = type == EntityType.BILLBOARD_L ? 0 : -128;

  const image = `billboard_${typeStr}.png`;
  const depth = 1;
  const x = entity.desc.x;
  const y = entity.desc.y;

  const staticImages: StaticImage[] = [
    {
      name: image
    }
  ];

  const opts: RenderOptions = {
    offset: { x: xOffset, y: 0 },
    zIndex: 1
  };

  const renderComp = new CParallax(entity.id,
                                   staticImages,
                                   [],
                                   image,
                                   depth,
                                   opts);

  const spatialComp = new CSpatial(entity.id, em);

  em.addEntity(entity.id, EntityType.PARALLAX_SPRITE, [ spatialComp,
                                                        renderComp ]);

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);
  spatialSys.setStaticPos(entity.id, x, y);
}
