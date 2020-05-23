import { EntityManager } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, AnimationDesc, CSprite,
         RenderSystem } from "../render_system";
import { PLAYER_SPEED } from "../common/constants";
import { CSpatial } from "../spatial_component";
import { ComponentType } from "../common/component_types";
import { GameEventType, EAgentAction, AgentActionType } from "../common/event";
import { EventHandlerFn, CBehaviour } from "../common/behaviour_system";
import { EntityType } from "../common/game_objects";

export function constructSoil(em: EntityManager, entity: EntityData) {
  const id = entity.id;

  const staticImages: StaticImage[] = [
    {
      name: "soil.png"
    }
  ];

  const animations: AnimationDesc[] = [
    {
      name: "soil_puff",
      duration: 1.0 / PLAYER_SPEED
    },
    {
      name: "soil_zap",
      duration: 1.0 / PLAYER_SPEED
    }
  ];

  const renderComp = new CSprite(id,
                                 staticImages,
                                 animations,
                                 "soil.png");

  const spatialComp = new CSpatial(id, em);

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_ACTION, e => {
    const event = <EAgentAction>e;
    if (event.actionType == AgentActionType.DIG) {
      renderSys.playAnimation(id, "soil_zap", () => {
        em.removeEntity(id);
      });
    }
  });
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    renderSys.playAnimation(id, "soil_puff", () => {
      em.removeEntity(id);
    });
  });

  const behaviourComp = new CBehaviour(id, targetedEvents);

  em.addEntity(id, EntityType.SOIL, [ spatialComp, renderComp, behaviourComp ]);
}
