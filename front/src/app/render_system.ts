import * as PIXI from 'pixi.js';
import { EntityManager } from "./common/entity_manager";
import { GameError } from "./common/error";
import { GameEvent, GameEventType, EEntityMoved } from "./common/event";
import { ComponentType } from "./common/component_types";
import { ClientSystem } from './common/client_system';
import { Component, EntityId, ComponentPacket } from './common/system';
import { Scheduler, ScheduledFnHandle } from './scheduler';
import { ClientSpatialComponent } from './client_spatial_component';
import { BLOCK_SZ } from './common/constants';
import { Span2d } from './common/span';
import { Shape, ShapeType, Circle, Rectangle } from './common/geometry';
import { clamp } from './common/utils';

export class Colour {
  private _r: number = 0;
  private _g: number = 0;
  private _b: number = 0;
  private _a: number = 1;

  constructor(r: number, g: number, b: number, a: number = 1.0) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  set r(value: number) {
    this._r = clamp(value, 0, 1);
  }

  set g(value: number) {
    this._g = clamp(value, 0, 1);
  }

  set b(value: number) {
    this._b = clamp(value, 0, 1);
  }

  set a(value: number) {
    this._a = clamp(value, 0, 1);
  }

  get r() {
    return this._r;
  }

  get g() {
    return this._g;
  }

  get b() {
    return this._b;
  }

  get a() {
    return this._a;
  }

  get value(): number {
    return Math.round(this.r * 255) * 16 * 16 * 16 * 16 +
           Math.round(this.g * 255) * 16 * 16 +
           Math.round(this.b * 255);
  }
}

export interface AnimationDesc {
  duration: number;
  name: string;
  endFrame?: string;
  endFrameDelayMs?: number;
}

export interface StaticImage {
  name: string;
}

interface Animation {
  sprite: PIXI.AnimatedSprite;
  endFrame?: string;
  endFrameDelayMs?: number;
  setEndFrameFnHandle: ScheduledFnHandle; // Set to -1 by default
}

export enum RenderComponentType {
  SHAPE,
  SPRITE,
  TILED_REGION
}

export class RenderComponent extends Component {
  readonly renderComponentType: RenderComponentType;

  constructor(entityId: EntityId,
              type: RenderComponentType) {
    super(entityId, ComponentType.RENDER);

    this.renderComponentType = type;
  }
}

export class ShapeRenderComponent extends RenderComponent {
  readonly shape: Shape;
  readonly colour: Colour;
  readonly graphics = new PIXI.Graphics();

  constructor(entityId: EntityId, shape: Shape, colour: Colour) {
    super(entityId, RenderComponentType.SHAPE);

    this.shape = shape;
    this.colour = colour;
  }
}

export class SpriteRenderComponent extends RenderComponent {
  readonly staticImages: StaticImage[];
  readonly initialImage: string;
  readonly animDescs: AnimationDesc[];
  readonly staticSprites: Map<string, PIXI.Sprite>;
  readonly animatedSprites: Map<string, Animation>;
  stagedSprite: PIXI.Sprite|null = null;
  activeAnimation: Animation|null = null;

  constructor(entityId: EntityId,
              staticImages: StaticImage[],
              animations: AnimationDesc[],
              initialImage: string) {
    super(entityId,
          RenderComponentType.SPRITE);

    this.staticImages = staticImages;
    this.initialImage = initialImage;
    this.animDescs = animations;
    this.staticSprites = new Map<string, PIXI.Sprite>();
    this.animatedSprites = new Map<string, Animation>();
  }
}

export class TiledRegionRenderComponent extends RenderComponent {
  readonly staticImages: StaticImage[];
  readonly initialImage: string;
  readonly region: Span2d;
  readonly sprites: Map<string, PIXI.Sprite[]>;
  stagedSprites: string|null = null; // Key into the sprites map

  constructor(entityId: EntityId,
              region: Span2d,
              staticImages: StaticImage[],
              initialImage: string) {
    super(entityId,
          RenderComponentType.TILED_REGION);

    this.staticImages = staticImages;
    this.initialImage = initialImage;

    this.region = region;
    this.sprites = new Map<string, PIXI.Sprite[]>();
  }
}

export class RenderSystem implements ClientSystem {
  private _components: Map<number, RenderComponent>;
  private _em: EntityManager;
  private _scheduler: Scheduler;
  private _pixi: PIXI.Application;
  private _spriteSheet?: PIXI.Spritesheet;
  private _textures = new Map<string, PIXI.Texture>();

  constructor(entityManager: EntityManager,
              scheduler: Scheduler,
              pixi: PIXI.Application) {
    this._em = entityManager;
    this._scheduler = scheduler;
    this._pixi = pixi;
    this._components = new Map<number, RenderComponent>();
  }

  async init() {
    const resource = await this._loadResource("sprite_sheet",
                                              "assets/sprite_sheet.json");
    if (!resource || !resource.spritesheet) {
      throw new GameError("Sprite sheet not loaded");
    }
    this._spriteSheet = resource.spritesheet;
  }

  async addImage(name: string, url: string) {
    if (!this._textures.has(name)) {
      const resource = await this._loadResource(name,
                                                url,
                                                PIXI.LoaderResource.LOAD_TYPE.IMAGE);
      this._textures.set(name, resource.texture);
    }
  }

  updateComponent(packet: ComponentPacket) {}

  numComponents() {
    return this._components.size;
  }

  getSpriteComponent(id: EntityId): SpriteRenderComponent {
    const c = this.getComponent(id);
    if (c.renderComponentType != RenderComponentType.SPRITE) {
      throw new GameError(`Render component (id=${id}) is not of type SPRITE`);
    }
    return <SpriteRenderComponent>c;
  }

  playAnimation(entityId: EntityId,
                name: string,
                onFinish?: () => void): boolean {
    const c = this.getSpriteComponent(entityId);

    const anim = c.animatedSprites.get(name); 
    if (!anim) {
      throw new GameError(`Entity ${entityId} has no animation '${name}'`);
    }

    this._spriteCompSetActiveSprite(c, name, true);

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

  addStaticImage(entityId: EntityId, image: StaticImage) {
    const c = this.getSpriteComponent(entityId);
    if (!c.staticImages.find(i => i.name === image.name)) {
      c.staticImages.push(image);

      const texture = this._findTexture(image.name);
      const sprite = new PIXI.Sprite(texture);
  
      c.staticSprites.set(image.name, sprite);
    }
  }

  setCurrentImage(entityId: EntityId, name: string) {
    const c = this.getComponent(entityId);
    switch (c.renderComponentType) {
      case RenderComponentType.SPRITE: {
        const c_ = <SpriteRenderComponent>c;
        this._spriteCompSetActiveSprite(c_, name, false);
        break;
      }
      case RenderComponentType.TILED_REGION: {
        const c_ = <TiledRegionRenderComponent>c;
        this._tiledRegionCompSetActiveSprite(c_, name);
        break;
      }
      default: {
        throw new GameError(`Cannot set image on component of type ` +
                            `${c.renderComponentType}`);
      }
    }
  }

  addComponent(component: RenderComponent) {
    this._components.set(component.entityId, component);

    switch (component.renderComponentType) {
      case RenderComponentType.SPRITE: {
        this._addSpriteComponent(<SpriteRenderComponent>component);
        break;
      }
      case RenderComponentType.TILED_REGION: {
        this._addTiledRegionComponent(<TiledRegionRenderComponent>component);
        break;
      }
      case RenderComponentType.SHAPE: {
        this._addShapeComponent(<ShapeRenderComponent>component);
        break;
      }
    }
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
    const c = this.getComponent(id);
    switch (c.renderComponentType) {
      case RenderComponentType.SPRITE: {
        this._removeSpriteComponent(<SpriteRenderComponent>c);
        break;
      }
      case RenderComponentType.TILED_REGION: {
        this._removeTiledRegionComponent(<TiledRegionRenderComponent>c);
        break;
      }
      case RenderComponentType.SHAPE: {
        this._removeShapeComponent(<ShapeRenderComponent>c);
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

  update() {}

  private _addShapeComponent(c: ShapeRenderComponent) {
    c.graphics.beginFill(c.colour.value, Math.floor(c.colour.a * 256));

    switch (c.shape.type) {
      case ShapeType.CIRCLE: {
        const circle = <Circle>c.shape;
        c.graphics.drawCircle(0, 0, circle.radius);
        break;
      }
      case ShapeType.RECTANGLE: {
        const rect = <Rectangle>c.shape;
        c.graphics.drawRect(0, 0, rect.width, rect.height);
        break;
      }
      default: {
        throw new GameError(`Render system doesn't support shapes of type ` +
                            `${c.shape.type}`);
      }
    }

    c.graphics.endFill();
    this._pixi.stage.addChild(c.graphics);

    this._onEntityMoved(c.entityId);
  }

  private _loadResource(name: string,
                        url: string,
                        type?: PIXI.LoaderResource.LOAD_TYPE):
    Promise<PIXI.LoaderResource> {

    return new Promise((resolve, reject) => {
      this._pixi.loader.add(name, url, type ? { loadType: type } : {})
                       .load((loader, resources) => resolve(resources[name]));
    });
  }

  private _removeShapeComponent(c: ShapeRenderComponent) {
    this._pixi.stage.removeChild(c.graphics);
    this._components.delete(c.entityId);
  }

  private _addSpriteComponent(c: SpriteRenderComponent) {
    c.animDescs.forEach(anim => {
      if (!this._spriteSheet) {
        throw new GameError("Sprite sheet not set");
      }

      const textures = this._spriteSheet.animations[anim.name];
      const sprite = new PIXI.AnimatedSprite(textures);

      const defaultDuration = sprite.textures.length / 60;
      const speedUp = defaultDuration / anim.duration;
      sprite.animationSpeed = speedUp;

      c.animatedSprites.set(anim.name, {
        sprite,
        endFrame: anim.endFrame,
        endFrameDelayMs: anim.endFrameDelayMs,
        setEndFrameFnHandle: -1
      });
    });

    c.staticImages.forEach(imgDesc => {
      const texture = this._findTexture(imgDesc.name);
      const sprite = new PIXI.Sprite(texture);

      c.staticSprites.set(imgDesc.name, sprite);
    });

    this._spriteCompSetActiveSprite(c, c.initialImage, false);
  }

  private _findTexture(name: string): PIXI.Texture {
    let texture: PIXI.Texture|null = null;

    if (this._spriteSheet) {
      texture = this._spriteSheet.textures[name];
    }

    if (!texture) {
      texture = this._textures.get(name) || null;
    }

    if (!texture) {
      throw new GameError(`Texture with name ${name} not loaded`);
    }

    return texture;
  }

  private _removeSpriteComponent(c: SpriteRenderComponent) {
    if (c.stagedSprite) {
      this._pixi.stage.removeChild(c.stagedSprite);
    }
    this._components.delete(c.entityId);
  }

  private _removeTiledRegionComponent(c: TiledRegionRenderComponent) {
    if (c.stagedSprites !== null) {
      const sprites = c.sprites.get(c.stagedSprites);

      if (sprites) {
        sprites.forEach(sprite => {
          this._pixi.stage.removeChild(sprite);
        });
      }
    }

    this._components.delete(c.entityId);
  }

  private _addTiledRegionComponent(c: TiledRegionRenderComponent) {
    c.staticImages.forEach(imgDesc => {
      const texture = this._findTexture(imgDesc.name);
      const sprites: PIXI.TilingSprite[] = [];

      for (const [j, spans] of c.region.spans) {
        for (const span of spans) {
          const x = span.a * BLOCK_SZ;
          const y = j * BLOCK_SZ;
          const n = span.b - span.a + 1;

          const sprite = new PIXI.TilingSprite(texture, n * BLOCK_SZ, BLOCK_SZ);
          sprite.position.set(x, y);
          sprites.push(sprite);
        }
      }

      c.sprites.set(imgDesc.name, sprites);
    });

    this._tiledRegionCompSetActiveSprite(c, c.initialImage);
  }

  private _onEntityMoved(id: EntityId) {
    if (this.hasComponent(id)) {
      const spatialComp =
        <ClientSpatialComponent>this._em.getComponent(ComponentType.SPATIAL,
                                                      id);
      const c_ = this.getComponent(id);
      switch (c_.renderComponentType) {
        case RenderComponentType.SPRITE: {
          const c = <SpriteRenderComponent>c_;
          if (c.stagedSprite) {
            c.stagedSprite.pivot.set(BLOCK_SZ * 0.5, BLOCK_SZ * 0.5);
            c.stagedSprite.position.set(spatialComp.x + BLOCK_SZ * 0.5,
                                        spatialComp.y + BLOCK_SZ * 0.5);
            c.stagedSprite.rotation = spatialComp.angle;
          }
          break;
        }
        case RenderComponentType.SHAPE: {
          const c = <ShapeRenderComponent>c_;
          c.graphics.pivot.set(BLOCK_SZ * 0.5, BLOCK_SZ * 0.5);
          c.graphics.position.set(spatialComp.x + BLOCK_SZ * 0.5,
                                  spatialComp.y + BLOCK_SZ * 0.5);
          c.graphics.rotation = spatialComp.angle;

          break;
        }
      }
    }
  }

  private _spriteCompSetActiveSprite(c: SpriteRenderComponent,
                                     name: string,
                                     animated: boolean) {
    if (c.stagedSprite) {
      this._pixi.stage.removeChild(c.stagedSprite);
    }

    if (c.activeAnimation) {
      const endFrameFnHandle = c.activeAnimation.setEndFrameFnHandle;
      this._scheduler.removeFunction(endFrameFnHandle);
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

  private _tiledRegionCompSetActiveSprite(c: TiledRegionRenderComponent,
                                          name: string) {
    if (c.stagedSprites !== null) {
      const sprites = c.sprites.get(c.stagedSprites);
      if (sprites) {
        sprites.forEach(sprite => {
          this._pixi.stage.removeChild(sprite);
        });
      }
    }

    const sprites = c.sprites.get(name);
    if (!sprites) {
      throw new GameError("Component has no sprite with name " + name);
    }
    sprites.forEach(sprite => {
      this._pixi.stage.addChild(sprite);
    });
    c.stagedSprites = name;
  }
}
