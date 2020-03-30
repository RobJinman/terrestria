import { EntityManager } from "../entity_manager";
import { EntityData } from "../common/entity_manager";
import { StaticImage, AnimationDesc, CSprite,
         RenderSystem } from "../render_system";
import { PLAYER_SPEED } from "../common/constants";
import { PLAYER_Z_INDEX } from "../constants";
import { CSpatial } from "../spatial_component";
import { ComponentType } from "../common/component_types";
import { GameEventType, EAgentAction, AgentActionType } from "../common/event";
import { EventHandlerFn, CBehaviour } from "../common/behaviour_system";
import { CInventory } from "../inventory_system";
import { EntityType } from "../common/game_objects";
import { Direction } from "../common/definitions";

function directionToLetter(direction: Direction): string {
  switch (direction) {
    case Direction.UP: return "u";
    case Direction.RIGHT: return "r";
    case Direction.DOWN: return "d";
    case Direction.LEFT: return "l";
  }
}

export function constructPlayer(em: EntityManager, entity: EntityData) {
  const id = entity.id;

  const staticImages: StaticImage[] = [
    {
      name: "man_run_u0.png"
    },
    {
      name: "man_run_r0.png"
    },
    {
      name: "man_run_d0.png"
    },
    {
      name: "man_run_l0.png"
    }
  ]

  const endFrameDelayMs = 150;
  const duration = 1.0 / PLAYER_SPEED;

  const animations: AnimationDesc[] = [
    {
      name: "explosion",
      duration: duration,
      endFrameDelayMs
    },
    {
      name: "man_run_u",
      duration: duration,
      endFrame: "man_run_u0.png",
      endFrameDelayMs
    },
    {
      name: "man_run_r",
      duration: duration,
      endFrame: "man_run_r0.png",
      endFrameDelayMs
    },
    {
      name: "man_run_d",
      duration: duration,
      endFrame: "man_run_d0.png",
      endFrameDelayMs
    },
    {
      name: "man_run_l",
      duration: duration,
      endFrame: "man_run_l0.png",
      endFrameDelayMs
    },
    {
      name: "man_dig_u",
      duration: duration,
      endFrame: "man_run_u0.png",
      endFrameDelayMs
    },
    {
      name: "man_dig_r",
      duration: duration,
      endFrame: "man_run_r0.png",
      endFrameDelayMs
    },
    {
      name: "man_dig_d",
      duration: duration,
      endFrame: "man_run_d0.png",
      endFrameDelayMs
    },
    {
     name: "man_dig_l",
     duration: duration,
     endFrame: "man_run_l0.png",
     endFrameDelayMs
    },
    {
      name: "man_push_r",
      duration: duration,
      endFrame: "man_run_r0.png",
      endFrameDelayMs
    },
    {
     name: "man_push_l",
     duration: duration,
     endFrame: "man_run_l0.png",
     endFrameDelayMs
    }
  ];

  const renderComp = new CSprite(id,
                                 staticImages,
                                 animations,
                                 "man_run_d0.png",
                                 { zIndex: PLAYER_Z_INDEX });

  const spatialComp = new CSpatial(id, em);

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    console.log("Player burned");
    renderSys.playAnimation(id, "explosion", () => {
      em.removeEntity(id);
    });
  });
  targetedEvents.set(GameEventType.PLAYER_KILLED, e => {
    renderSys.playAnimation(id, "explosion", () => {
      em.removeEntity(id);
    });
  });
  targetedEvents.set(GameEventType.AGENT_ACTION, e => {
    const event = <EAgentAction>e;
    const dirChar = directionToLetter(event.direction);

    switch (event.actionType) {
      case AgentActionType.DIG:
        renderSys.playAnimation(id, "man_dig_" + dirChar);
        break;
      case AgentActionType.RUN:
        renderSys.playAnimation(id, "man_run_" + dirChar);
        break;
      case AgentActionType.JUMP:
        renderSys.playAnimation(id, "man_jump");
        break;
      case AgentActionType.PUSH:
        renderSys.playAnimation(id, "man_push_" + dirChar);
        break;
    }
  });

  const behaviourComp = new CBehaviour(id, targetedEvents);

  const inventoryComp = new CInventory(id);

  em.addEntity(id, EntityType.PLAYER, [ spatialComp,
                                        renderComp,
                                        behaviourComp,
                                        inventoryComp ]);
}
