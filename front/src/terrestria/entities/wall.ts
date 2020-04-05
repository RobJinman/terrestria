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

export function constructWall(em: EntityManager, entity: EntityData) {
  const id = entity.id;

  const staticImages: StaticImage[] = [
    {
      name: `wall.png`
    }
  ];

  const animations: AnimationDesc[] = [
    {
      name: `wall_burn`,
      duration: 1.0 / PLAYER_SPEED
    }
  ];

  const renderComp = new CSprite(id,
                                 staticImages,
                                 animations,
                                 `wall.png`);

  const spatialComp = new CSpatial(id, em);

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    renderSys.playAnimation(id, `wall_burn`, () => {
      em.removeEntity(id);
    });
  });

  const behaviourComp = new CBehaviour(id, targetedEvents);

  em.addEntity(id, EntityType.WALL, [ spatialComp,
                                      renderComp,
                                      behaviourComp ]);
}
