import { EntityManager } from "./common/entity_manager";
import { RNewEntities } from "./common/response";
import { EntityType } from "./common/game_objects";
import { RenderComponent, StaticImage, AnimationDesc,
         RenderSystem } from "./render_system";
import { EntityId } from "./common/system";
import { PLAYER_SPEED } from "./common/constants";
import { BehaviourComponent, EventHandlerFn } from "./common/behaviour_system";
import { GameEventType, EAgentAction, AgentActionType } from "./common/event";
import { ComponentType } from "./common/component_types";
import { Direction } from "./common/definitions";
import { ClientSpatialComponent } from "./client_spatial_component";

function constructGem(em: EntityManager, id: EntityId) {
  const staticImages: StaticImage[] = [
    {
      name: "gem.png"
    }
  ];

  const animations: AnimationDesc[] = [
    {
      name: "gem_burn",
      duration: 1.0 / PLAYER_SPEED
    }
  ];

  const renderComp = new RenderComponent(id,
                                         staticImages,
                                         animations,
                                         "gem.png");

  const spatialComp = new ClientSpatialComponent(id, em);

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    renderSys.playAnimation(id, "gem_burn", () => {
      em.removeEntity(id);
    });
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.GEM, [ spatialComp,
                                     renderComp,
                                     behaviourComp ]);
}

function constructRock(em: EntityManager, id: EntityId) {
  const staticImages: StaticImage[] = [
    {
      name: "rock.png"
    }
  ];

  const animations: AnimationDesc[] = [
    {
      name: "rock_burn",
      duration: 1.0 / PLAYER_SPEED
    }
  ];

  const renderComp = new RenderComponent(id,
                                         staticImages,
                                         animations,
                                         "rock.png");

  const spatialComp = new ClientSpatialComponent(id, em);

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    renderSys.playAnimation(id, "rock_burn", () => {
      em.removeEntity(id);
    });
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.ROCK, [ spatialComp,
                                      renderComp,
                                      behaviourComp ]);
}

function constructSoil(em: EntityManager, id: EntityId) {
  const staticImages: StaticImage[] = [
    {
      name: "soil.png"
    }
  ];

  const animations: AnimationDesc[] = [
    {
      name: "soil_puff",
      duration: 1.0 / PLAYER_SPEED
    }
  ];

  const renderComp = new RenderComponent(id,
                                         staticImages,
                                         animations,
                                         "soil.png");

  const spatialComp = new ClientSpatialComponent(id, em);

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.AGENT_ACTION, e => {
    const event = <EAgentAction>e;
    if (event.actionType == AgentActionType.DIG) {
      renderSys.playAnimation(id, "soil_puff", () => {
        em.removeEntity(id);
      });
    }
  });
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
    renderSys.playAnimation(id, "soil_puff", () => {
      em.removeEntity(id);
    });
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.SOIL, [ spatialComp, renderComp, behaviourComp ]);
}

function directionToLetter(direction: Direction): string {
  switch (direction) {
    case Direction.UP: return "u";
    case Direction.RIGHT: return "r";
    case Direction.DOWN: return "d";
    case Direction.LEFT: return "l";
  }
  return "";
}

function constructPlayer(em: EntityManager, id: EntityId) {
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

  const renderComp = new RenderComponent(id,
                                         staticImages,
                                         animations,
                                         "man_run_d0.png");

  const spatialComp = new ClientSpatialComponent(id, em);

  const renderSys = <RenderSystem>em.getSystem(ComponentType.RENDER);

  const targetedEvents = new Map<GameEventType, EventHandlerFn>();
  targetedEvents.set(GameEventType.ENTITY_BURNED, e => {
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
      case AgentActionType.PUSH:
        renderSys.playAnimation(id, "man_push_" + dirChar);
        break;
    }
  });

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.PLAYER, [ spatialComp,
                                        renderComp,
                                        behaviourComp ]);
}

export function constructEntities(entityManager: EntityManager,
                                  response: RNewEntities) {
  response.entities.forEach(entity => {
    switch (entity.type) {
      case EntityType.PLAYER:
        constructPlayer(entityManager, entity.id);
        break;
      case EntityType.GEM:
        constructGem(entityManager, entity.id);
        break;
      case EntityType.ROCK:
        constructRock(entityManager, entity.id);
        break;
      case EntityType.SOIL:
        constructSoil(entityManager, entity.id);
        break;
    }
  });
}
