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
import { Component } from "../common/system";

export function constructDestructableWall(em: EntityManager,
                                          entity: EntityData) {
  constructWall(em, entity, true);
}

export function constructMetalWall(em: EntityManager,
                                   entity: EntityData) {
  constructWall(em, entity, false);
}

function constructWall(em: EntityManager,
                       entity: EntityData,
                       destructable: boolean) {
  const id = entity.id;

  const typeString = destructable ? "wall" : "metal_wall";

  const staticImages: StaticImage[] = [
    {
      name: `${typeString}.png`
    }
  ];

  const animations: AnimationDesc[] = [];
  if (destructable) {
    animations.push({
      name: `wall_burn`,
      duration: 1.0 / PLAYER_SPEED
    });
  }

  const renderComp = new CSprite(id,
                                 staticImages,
                                 animations,
                                 `${typeString}.png`);

  const spatialComp = new CSpatial(id, em);

  const components: Component[] = [ spatialComp, renderComp ];

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  if (destructable) {
    const targetedEvents = new Map<GameEventType, EventHandlerFn>();
    targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
      renderSys.playAnimation(id, `wall_burn`, () => {
        em.removeEntity(id);
      });
    });

    const behaviourComp = new CBehaviour(id, targetedEvents);

    components.push(behaviourComp);
  }

  const type = destructable ? EntityType.WALL : EntityType.METAL_WALL;
  em.addEntity(id, type, components);
}
