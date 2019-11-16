import * as PIXI from 'pixi.js';
import { EntityManager } from "./common/entity_manager";
import { GameError } from "./common/error";
import { GameEvent, GameEventType, EEntityMoved } from "./common/event";
import { ComponentType } from "./common/component_types";
import { SpatialComponent } from "./common/spatial_system";
import { ClientSystem } from './common/client_system';
import { Component, EntityId, ComponentPacket } from './common/system';
import { Scheduler, ScheduledFnHandle } from './scheduler';

export interface AnimationDesc {
  duration: number;
  name: string;
  scaleFactor: number;
  endFrame?: string;
  endFrameDelayMs?: number;
}

export interface StaticImage {
  name: string;
  scaleFactor: number;
}

interface Animation {
  sprite: PIXI.AnimatedSprite;
  endFrame?: string;
  endFrameDelayMs?: number;
  setEndFrameFnHandle: ScheduledFnHandle; // Set to -1 by default
}

export class RenderComponent extends Component {
  _animDescs: AnimationDesc[];
  _staticImages: StaticImage[];
  _initialImage: string;
  staticSprites: Map<string, PIXI.Sprite>;
  animatedSprites: Map<string, Animation>;
  stagedSprite: PIXI.Sprite|null = null;
  activeAnimation: Animation|null = null;

  constructor(entityId: EntityId,
              staticImages: StaticImage[],
              animations: AnimationDesc[],
              initialImage: string) {
    super(entityId, ComponentType.RENDER);

    this._staticImages = staticImages;
    this._initialImage = initialImage;
    this._animDescs = animations;

    this.staticSprites = new Map<string, PIXI.Sprite>();
    this.animatedSprites = new Map<string, Animation>();
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

  playAnimation(entityId: EntityId,
                name: string,
                onFinish?: () => void): boolean {
    const c = this.getComponent(entityId);

    const anim = c.animatedSprites.get(name); 
    if (!anim) {
      throw new GameError(`Entity ${entityId} has no animation '${name}'`);
    }

    this._setActiveSprite(c, name, true);

    anim.sprite.loop = false;
    anim.sprite.gotoAndPlay(0);

    anim.sprite.onComplete = () => {
      if (onFinish) {
        this._scheduler.addFunction(onFinish, -1);
      }
      if (anim.endFrame) {
        anim.setEndFrameFnHandle = this._scheduler.addFunction(() => {
          if (this.hasComponent(entityId)) {
            this.setCurrentImage(entityId, anim.endFrame || "");
          }
        }, anim.endFrameDelayMs || 100);
      }
    }

    return true;
  }

  setCurrentImage(entityId: EntityId, name: string) {
    const c = this.getComponent(entityId);
    this._setActiveSprite(c, name, false);
  }

  addComponent(component: RenderComponent) {
    this._components.set(component.entityId, component);

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

      const defaultDuration = sprite.textures.length / 60;
      const speedUp = defaultDuration / anim.duration;
      sprite.animationSpeed = speedUp;

      component.animatedSprites.set(anim.name, {
        sprite,
        endFrame: anim.endFrame,
        endFrameDelayMs: anim.endFrameDelayMs,
        setEndFrameFnHandle: -1
      });
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

    this._setActiveSprite(component, component.initialImage, false);
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
    if (c && c.stagedSprite) {
      this._pixi.stage.removeChild(c.stagedSprite);
    }

    this._components.delete(id);
  }

  handleEvent(event: GameEvent) {
    switch (event.type) {
      case GameEventType.ENTITY_MOVED:
        const ev = <EEntityMoved>event;
        this._onEntityMoved(ev.entityId);
        break;
    }
  }

  update() {}

  getDirties() {
    return [];
  }

  private _onEntityMoved(id: EntityId) {
    if (this.hasComponent(id)) {
      const spatialComp =
        <SpatialComponent>this._em.getComponent(ComponentType.SPATIAL, id);

      const c = this.getComponent(id);
      if (c.stagedSprite) {
        c.stagedSprite.x = spatialComp.x;
        c.stagedSprite.y = spatialComp.y;
      }
    }
  }

  private _setActiveSprite(c: RenderComponent,
                           name: string,
                           animated: boolean) {
    if (c.stagedSprite) {
      this._pixi.stage.removeChild(c.stagedSprite);
    }
    if (c.activeAnimation) {
      this._scheduler.removeFunction(c.activeAnimation.setEndFrameFnHandle);
    }
    if (animated) {
      const anim = c.animatedSprites.get(name);
      if (!anim) {
        throw new GameError("Component has no sprite with name " + name);
      }
      this._pixi.stage.addChild(anim.sprite);
      c.stagedSprite = anim.sprite;
      c.activeAnimation = anim;
    }
    else {
      const sprite = c.staticSprites.get(name);
      if (!sprite) {
        throw new GameError("Component has no sprite with name " + name);
      }
      this._pixi.stage.addChild(sprite);
      c.stagedSprite = sprite;
    }

    this._onEntityMoved(c.entityId);
  }
}
