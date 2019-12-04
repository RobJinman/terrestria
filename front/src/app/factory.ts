import { EntityManager, Entity,
         getNextEntityId } from "./common/entity_manager";
import { RNewEntities, ClientMapData } from "./common/response";
import { EntityType } from "./common/game_objects";
import { StaticImage, AnimationDesc, RenderSystem, SpriteRenderComponent,
         TiledRegionRenderComponent, ShapeRenderComponent,
         Colour } from "./render_system";
import { PLAYER_SPEED, BLOCK_SZ } from "./common/constants";
import { BehaviourComponent, EventHandlerFn } from "./common/behaviour_system";
import { GameEventType, EAgentAction, AgentActionType } from "./common/event";
import { ComponentType } from "./common/component_types";
import { Direction } from "./common/definitions";
import { ClientSpatialComponent } from "./client_spatial_component";
import { Span2d } from "./common/span";
import { Rectangle } from "./common/geometry";
import { ClientAdComponent } from "./client_ad_system";

function constructGem(em: EntityManager, entity: Entity) {
  const id = entity.id;

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

  const renderComp = new SpriteRenderComponent(id,
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

function constructRock(em: EntityManager, entity: Entity) {
  const id = entity.id;

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

  const renderComp = new SpriteRenderComponent(id,
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

function constructSoil(em: EntityManager, entity: Entity) {
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
    }
  ];

  const renderComp = new SpriteRenderComponent(id,
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

function constructPlayer(em: EntityManager, entity: Entity) {
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

  const renderComp = new SpriteRenderComponent(id,
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

function constructEarth(em: EntityManager, mapData: ClientMapData) {
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

  const renderComp = new TiledRegionRenderComponent(id,
                                                    digRegion,
                                                    images,
                                                    "earth.png");

  em.addEntity(id, EntityType.EARTH, [ renderComp ]);
}

function constructSky(em: EntityManager, mapData: ClientMapData) {
  const id = getNextEntityId();

  const shape = new Rectangle(mapData.width * BLOCK_SZ, 5 * BLOCK_SZ);
  const colour = new Colour(0.5, 0.5, 0.99);

  const renderComp = new ShapeRenderComponent(id, shape, colour);

  const spatialComp = new ClientSpatialComponent(id, em);
  spatialComp.setStaticPos(0, 0);

  em.addEntity(id, EntityType.OTHER, [ spatialComp, renderComp ]);
}

function constructBlimp(em: EntityManager, entity: Entity) {
  const staticImages: StaticImage[] = [
    {
      name: "blimp.png"
    }
  ];

  const renderComp = new SpriteRenderComponent(entity.id,
                                               staticImages,
                                               [],
                                               "blimp.png");

  const spatialComp = new ClientSpatialComponent(entity.id, em);

  em.addEntity(entity.id, EntityType.OTHER, [ spatialComp, renderComp ]);  
}

function constructAd(em: EntityManager, entity: Entity) {
  const staticImages: StaticImage[] = [
    {
      name: "blimp_ad_placeholder.png"
    }
  ];

  const renderComp = new SpriteRenderComponent(entity.id,
                                               staticImages,
                                               [],
                                               "blimp_ad_placeholder.png");

  const spatialComp = new ClientSpatialComponent(entity.id, em);

  const adComp = new ClientAdComponent(entity.id);

  em.addEntity(entity.id, EntityType.OTHER, [ spatialComp,
                                              renderComp,
                                              adComp ]);  
}

export function constructEntities(entityManager: EntityManager,
                                  mapData: ClientMapData,
                                  response: RNewEntities) {
  response.entities.forEach(entity => {
    switch (entity.type) {
      case EntityType.PLAYER: {
        constructPlayer(entityManager, entity);
        break;
      }
      case EntityType.GEM: {
        constructGem(entityManager, entity);
        break;
      }
      case EntityType.ROCK: {
        constructRock(entityManager, entity);
        break;
      }
      case EntityType.SOIL: {
        constructSoil(entityManager, entity);
        break;
      }
      case EntityType.BLIMP: {
        constructBlimp(entityManager, entity);
        break;
      }
      case EntityType.AD: {
        constructAd(entityManager, entity);
        break;
      }
    }
  });
}

// Construct any client-side only entities from map data
export function initialiseGame(entityManager: EntityManager,
                               mapData: ClientMapData) {
  constructEarth(entityManager, mapData);
  constructSky(entityManager, mapData);
}
