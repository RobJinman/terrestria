import { EntityManager } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, AnimationDesc, CSprite,
         RenderSystem } from "../render_system";
import { PLAYER_SPEED } from "../common/constants";
import { CSpatial } from "../spatial_component";
import { ComponentType } from "../common/component_types";
import { GameEventType } from "../common/event";
import { EventHandlerFn, CBehaviour } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";
import { GameError } from "../common/error";
import { SpatialSystem } from "../spatial_system";

export function constructGemBundle(em: EntityManager, entity: EntityData) {
  const id = entity.id;
  const value = entity.desc.value;

  if (value < 1 || value > 5) {
    throw new GameError(`Cannot construct gem bundle with value ${value}`);
  }

  const staticImages: StaticImage[] = [
    {
      name: `gem_bundle_${value}.png`
    }
  ];

  const animations: AnimationDesc[] = [
    {
      name: `gem_bundle_${value}_burn`,
      duration: 1.0 / PLAYER_SPEED
    }
  ];

  const renderComp = new CSprite(id,
                                 staticImages,
                                 animations,
                                 `gem_bundle_${value}.png`);

  const spatialComp = new CSpatial(id, em);

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    renderSys.playAnimation(id, `gem_bundle_${value}_burn`, () => {
      em.removeEntity(id);
    });
  });

  const behaviourComp = new CBehaviour(id, targetedEvents);

  em.addEntity(id, EntityType.GEM_BUNDLE, [ spatialComp,
                                            renderComp,
                                            behaviourComp ]);

  const spatialSys = <SpatialSystem>em.getSystem(ComponentType.SPATIAL);

  spatialSys.setStaticPos(id, entity.desc.x, entity.desc.y);
}
