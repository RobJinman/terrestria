import * as PIXI from 'pixi.js';
import { EntityManager } from "./common/entity_manager";
import { GameError } from "./common/error";
import { GameEvent, GameEventType, EEntityMoved } from "./common/event";
import { ComponentType } from "./common/component_types";
import { SpatialComponent } from "./common/spatial_system";
import { ClientSystem } from './common/client_system';
import { Component, EntityId, ComponentPacket } from './common/system';
import { Scheduler } from './scheduler';

export interface Animation {
  duration: number;
  name: string;
  scaleFactor: number;
}

export interface StaticImage {
  name: string;
  scaleFactor: number;
}

export class RenderComponent extends Component {
  _animDescs: Animation[];
  _staticImages: StaticImage[];
  _initialImage: string;
  staticSprites: Map<string, PIXI.Sprite>;
  animatedSprites: Map<string, PIXI.AnimatedSprite>;
  activeSprite?: PIXI.Sprite;

  constructor(entityId: EntityId,
              staticImages: StaticImage[],
              animations: Animation[],
              initialImage: string) {
    super(entityId, ComponentType.RENDER);

    this._staticImages = staticImages;
    this._initialImage = initialImage;
    this._animDescs = animations;

    this.staticSprites = new Map<string, PIXI.Sprite>();
    this.animatedSprites = new Map<string, PIXI.AnimatedSprite>();
  }

  get staticImages() {
    return this._staticImages;
  }

  get initialImage() {
    return this._initialImage;
  }

  get animDescs() {
    return this._animDescs;
  }
}

export class RenderSystem implements ClientSystem {
  private _components: Map<number, RenderComponent>;
  private _em: EntityManager;
  private _scheduler: Scheduler;
  private _pixi: PIXI.Application;
  private _spriteSheet?: PIXI.Spritesheet;

  constructor(entityManager: EntityManager,
              scheduler: Scheduler,
              pixi: PIXI.Application) {
    this._em = entityManager;
    this._scheduler = scheduler;
    this._pixi = pixi;
    this._components = new Map<number, RenderComponent>();
  }

  setSpriteSheet(spriteSheet: PIXI.Spritesheet) {
    this._spriteSheet = spriteSheet;
  }

  updateComponent(packet: ComponentPacket) {}

  numComponents() {
    return this._components.size;
  }

  playAnimation(entityId: EntityId, name: string, onFinish?: () => void) {
    const c = this.getComponent(entityId);

    const sprite = c.animatedSprites.get(name); 
    if (!sprite) {
      throw new GameError(`Entity ${entityId} has no animation '${name}'`);
    }

    if (!sprite.playing) {
      if (c.activeSprite) {
        this._pixi.stage.removeChild(c.activeSprite);
      }

      c.activeSprite = sprite;
      this._onEntityMoved(entityId);

      this._pixi.stage.addChild(sprite);
      sprite.loop = false;
      sprite.gotoAndPlay(0);

      if (onFinish) {
        sprite.onComplete = () => {
          this._scheduler.addFunction(onFinish, -1);
        }
      }
    }
  }

  setCurrentImage(entityId: EntityId, name: string) {
    const c = this.getComponent(entityId);
    if (c.activeSprite) {
      this._pixi.stage.removeChild(c.activeSprite);
    }
    c.activeSprite = c.staticSprites.get(name);
    if (!c.activeSprite) {
      throw new GameError(`Entity ${c.entityId} has no image with name ` +
                          `'${name}'`);
    }

    this._onEntityMoved(entityId);

    this._pixi.stage.addChild(c.activeSprite);
  }

  addComponent(component: RenderComponent) {
    this._components.set(component.entityId, component);

    const texture = this._getTexture(component.initialImage);
    texture.rotate = 8;
    component.activeSprite = new PIXI.Sprite(texture);

    component.animDescs.forEach(anim => {
      if (!this._spriteSheet) {
        throw new GameError("Sprite sheet not set");
      }

      const textures = this._spriteSheet.animations[anim.name];
      const sprite = new PIXI.AnimatedSprite(textures);
      sprite.textures.forEach(t => {
        t.rotate = 8;
      });
      sprite.width *= anim.scaleFactor;
      sprite.height *= anim.scaleFactor;
      sprite.animationSpeed = anim.duration;

      component.animatedSprites.set(anim.name, sprite);
    });

    component.staticImages.forEach(imgDesc => {
      if (!this._spriteSheet) {
        throw new GameError("Sprite sheet not set");
      }

      const texture = this._spriteSheet.textures[imgDesc.name];
      const sprite = new PIXI.Sprite(texture);
      sprite.texture.rotate = 8;
      sprite.width *= imgDesc.scaleFactor;
      sprite.height *= imgDesc.scaleFactor;

      component.staticSprites.set(imgDesc.name, sprite);
    });

    this._onEntityMoved(component.entityId);

    component.activeSprite = component.staticSprites
                                      .get(component.initialImage);

    if (!component.activeSprite) {
      throw new GameError(`Entity ${component.entityId} has no image with ` +
                          `name '${component.initialImage}'`);
    }

    this._pixi.stage.addChild(component.activeSprite);
  }

  hasComponent(id: EntityId) {
    return this._components.has(id);
  }

  getComponent(id: EntityId) {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No render component for entity ${id}`);
    }
    return c;
  }

  removeComponent(id: EntityId) {
    const c = this._components.get(id);
    if (c && c.activeSprite) {
      this._pixi.stage.removeChild(c.activeSprite);
    }

    this._components.delete(id);
  }

  private _onEntityMoved(id: EntityId) {
    if (this.hasComponent(id)) {
      const spatialComp =
        <SpatialComponent>this._em.getComponent(ComponentType.SPATIAL, id);

      const c = this.getComponent(id);
      if (c.activeSprite) {
        c.activeSprite.x = spatialComp.x;
        c.activeSprite.y = spatialComp.y;
      }
    }
  }

  handleEvent(event: GameEvent) {
    switch (event.type) {
      case GameEventType.ENTITY_MOVED:
        const ev = <EEntityMoved>event;
        this._onEntityMoved(ev.entityId);
        break;
    }
  }

  update() {
    // TODO
  }

  getDirties() {
    return [];
  }

  private _getTexture(name: string): PIXI.Texture {
    if (!this._spriteSheet || !this._spriteSheet.textures) {
      throw new GameError("Sprite sheet not set");
    }

    const val = this._spriteSheet.textures[name];
    if (!val) {
      throw new Error(`No texture with name '${name}'`);
    }
    return val;
  }
}
