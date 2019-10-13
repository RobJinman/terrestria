import { EntityManager } from "./common/entity_manager";
import { RNewEntities } from "./common/response";
import { EntityType } from "./common/game_objects";
import { SpatialComponent } from "./common/spatial_system";
import { RenderComponent, StaticImage, Animation,
         RenderSystem } from "./render_system";
import { EntityId } from "./common/system";
import { PLAYER_SPEED } from "./common/config";
import { BehaviourComponent, EventHandlerFn } from "./common/behaviour_system";
import { GameEventType, EAgentAction, AgentActionType } from "./common/event";
import { ComponentType } from "./common/component_types";

function constructGem(em: EntityManager, id: EntityId) {
  const staticImages: StaticImage[] = [
    {
      name: "gem.png",
      scaleFactor: 0.5
    }
  ];

  const renderComp = new RenderComponent(id, staticImages, [], "gem.png");

  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    stackable: false,
    heavy: true,
    movable: false,
    isAgent: false
  });

  em.addEntity(id, EntityType.GEM, [ spatialComp, renderComp ]);
}

function constructRock(em: EntityManager, id: EntityId) {
  const staticImages: StaticImage[] = [
    {
      name: "rock.png",
      scaleFactor: 0.5
    }
  ];

  const renderComp = new RenderComponent(id, staticImages, [], "rock.png");

  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: true,
    stackable: false,
    heavy: true,
    movable: true,
    isAgent: false
  });

  em.addEntity(id, EntityType.ROCK, [ spatialComp, renderComp ]);
}

function constructSoil(em: EntityManager, id: EntityId) {
  const staticImages: StaticImage[] = [
    {
      name: "soil.png",
      scaleFactor: 0.5
    }
  ];

  const animations: Animation[] = [
    {
      name: "soil_puff",
      duration: 1.0 / PLAYER_SPEED,
      scaleFactor: 0.5
    }
  ];

  const renderComp = new RenderComponent(id,
                                         staticImages,
                                         animations,
                                         "soil.png");

  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    stackable: true,
    heavy: false,
    movable: false,
    isAgent: false
  });

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

  const behaviourComp = new BehaviourComponent(id, targetedEvents);

  em.addEntity(id, EntityType.SOIL, [ spatialComp, renderComp, behaviourComp ]);
}

function constructPlayer(em: EntityManager, id: EntityId) {
  const staticImages: StaticImage[] = [
    {
      name: "man_run_d0.png",
      scaleFactor: 0.5
    }
  ]

  const animations: Animation[] = [
    {
      name: "man_run_u",
      duration: 1.0 / PLAYER_SPEED,
      scaleFactor: 0.5
    },
    {
      name: "man_run_r",
      duration: 1.0 / PLAYER_SPEED,
      scaleFactor: 0.5
    },
    {
      name: "man_run_d",
      duration: 1.0 / PLAYER_SPEED,
      scaleFactor: 0.5
    },
    {
      name: "man_run_l",
      duration: 1.0 / PLAYER_SPEED,
      scaleFactor: 0.5
    },
    {
      name: "man_dig_u",
      duration: 1.0 / PLAYER_SPEED,
      scaleFactor: 0.5
    },
    {
      name: "man_dig_r",
      duration: 1.0 / PLAYER_SPEED,
      scaleFactor: 0.5
    },
    {
      name: "man_dig_d",
      duration: 1.0 / PLAYER_SPEED,
      scaleFactor: 0.5
    },
    {
     name: "man_dig_l",
     duration: 1.0 / PLAYER_SPEED,
     scaleFactor: 0.5
    },
    {
      name: "man_push_r",
      duration: 1.0 / PLAYER_SPEED,
      scaleFactor: 0.5
    },
    {
     name: "man_push_l",
     duration: 1.0 / PLAYER_SPEED,
     scaleFactor: 0.5
    }
  ];

  const renderComp = new RenderComponent(id,
                                         staticImages,
                                         animations,
                                         "man_run_d0.png");

  const spatialComp = new SpatialComponent(id, {
    solid: true,
    blocking: false,
    stackable: true,
    heavy: false,
    movable: false,
    isAgent: true
  });

  em.addEntity(id, EntityType.PLAYER, [ spatialComp,
                                        renderComp ]);
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
