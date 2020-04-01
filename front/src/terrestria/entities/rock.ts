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

export function constructRoundRock(em: EntityManager, entity: EntityData) {
  return constructRock(em, entity, false);
}

export function constructSquareRock(em: EntityManager, entity: EntityData) {
  return constructRock(em, entity, true);
}

function constructRock(em: EntityManager,
                       entity: EntityData,
                       square: boolean) {
  const id = entity.id;
  const typeString = square ? "square" : "round";

  const staticImages: StaticImage[] = [
    {
      name: `${typeString}_rock.png`
    }
  ];

  const animations: AnimationDesc[] = [
    {
      name: `${typeString}_rock_burn`,
      duration: 1.0 / PLAYER_SPEED
    }
  ];

  const renderComp = new CSprite(id,
                                 staticImages,
                                 animations,
                                 `${typeString}_rock.png`);

  const spatialComp = new CSpatial(id, em);

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    renderSys.playAnimation(id, `${typeString}_rock_burn`, () => {
      em.removeEntity(id);
    });
  });

  const behaviourComp = new CBehaviour(id, targetedEvents);

  const type = square ? EntityType.ROUND_ROCK : EntityType.SQUARE_ROCK;
  em.addEntity(id, type, [ spatialComp,
                           renderComp,
                           behaviourComp ]);
}
