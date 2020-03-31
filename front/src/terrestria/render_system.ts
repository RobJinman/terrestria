import * as PIXI from 'pixi.js';
import { GameError } from "./common/error";
import { GameEvent, GameEventType, EEntityMoved } from "./common/event";
import { ComponentType } from "./common/component_types";
import { ClientSystem } from './common/client_system';
import { Component, EntityId, ComponentPacket } from './common/system';
import { Scheduler, ScheduledFnHandle } from './common/scheduler';
import { CSpatial } from './spatial_component';
import { BLOCK_SZ, CLIENT_FRAME_RATE } from './common/constants';
import { Span2d } from './common/span';
import { Shape, ShapeType, Circle, Rectangle, Vec2 } from './common/geometry';
import { clamp } from './common/utils';
import { EntityManager } from './entity_manager';
import { SpatialContainer } from './spatial_container';

const VERTICAL_RESOLUTION = 10 * BLOCK_SZ;
const DEFAULT_Z_INDEX = 1000;
export const MAX_PARALLAX_DEPTH = 10;

export type OnInteractionFn = () => void;

export interface RenderOptions {
  zIndex?: number;
  screenPosition?: Vec2;
  onPress?: OnInteractionFn;
  onRelease?: OnInteractionFn;
}

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
  width?: number;
  height?: number;
}

interface Animation {
  sprite: PIXI.AnimatedSprite;
  endFrame?: string;
  endFrameDelayMs?: number;
  setEndFrameFnHandle: ScheduledFnHandle; // Set to -1 by default
}

export class CRender extends Component {
  readonly zIndex: number = 0;
  screenPosition: Vec2|null = null;
  readonly onPress: OnInteractionFn|null = null;
  readonly onRelease: OnInteractionFn|null = null;

  constructor(entityId: EntityId, options: RenderOptions) {
    super(entityId, ComponentType.RENDER);

    if (options.zIndex) {
      this.zIndex = options.zIndex;
    }
    if (options.screenPosition) {
      this.screenPosition = options.screenPosition;
    }
    if (options.onPress) {
      this.onPress = options.onPress;
    }
    if (options.onRelease) {
      this.onRelease = options.onRelease;
    }
  }
}

export class CShape extends CRender {
  readonly shape: Shape;
  readonly colour: Colour;
  readonly graphics = new PIXI.Graphics();

  constructor(entityId: EntityId,
              shape: Shape,
              colour: Colour,
              options: RenderOptions = {}) {
    super(entityId, options);

    const zIndex = options.zIndex ? options.zIndex : 0;

    this.shape = shape;
    this.colour = colour;
    this.graphics.zIndex = DEFAULT_Z_INDEX + zIndex;
  }
}

export class CSprite extends CRender {
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
              initialImage: string,
              options: RenderOptions = {}) {
    super(entityId, options);

    this.staticImages = staticImages;
    this.initialImage = initialImage;
    this.animDescs = animations;
    this.staticSprites = new Map<string, PIXI.Sprite>();
    this.animatedSprites = new Map<string, Animation>();
  }
}

export class CParallax extends CSprite {
  readonly depth: number;

  constructor(entityId: EntityId,
              staticImages: StaticImage[],
              animations: AnimationDesc[],
              initialImage: string,
              depth: number,
              options: RenderOptions = {}) {
    super(entityId, staticImages, animations, initialImage, options);

    this.depth = depth;
  }
}

export class CTiledRegion extends CRender {
  readonly staticImages: StaticImage[];
  readonly initialImage: string;
  readonly region: Span2d;
  readonly sprites: Map<string, PIXI.Sprite[]>;
  stagedSprites: string|null = null; // Key into the sprites map

  constructor(entityId: EntityId,
              region: Span2d,
              staticImages: StaticImage[],
              initialImage: string,
              options: RenderOptions = {}) {
    super(entityId, options);

    this.staticImages = staticImages;
    this.initialImage = initialImage;

    this.region = region;
    this.sprites = new Map<string, PIXI.Sprite[]>();
  }
}

interface DrawablePosition {
  drawable: PIXI.DisplayObject;
  x: number;
  y: number;
  rotation?: number;
}

export class RenderSystem implements ClientSystem {
  private _components: Map<EntityId, CRender>;
  private _parallaxComponents: Map<EntityId, CParallax>;
  private _screenSpaceComponents: Map<EntityId, CRender>;
  private _em: EntityManager;
  private _scheduler: Scheduler;
  private _pixi: PIXI.Application;
  private _spriteSheet?: PIXI.Spritesheet;
  private _textures = new Map<string, PIXI.Texture>();
  private _viewX = 0;
  private _viewY = 0;
  private _viewW = 0;
  private _viewH = VERTICAL_RESOLUTION;
  private _windowW = 0;
  private _windowH = 0;
  private _camera: Vec2 = { x: 0, y: 0 };
  private _spatialContainer?: SpatialContainer;
  private _prevVisible = new Set<EntityId>();

  constructor(entityManager: EntityManager,
              scheduler: Scheduler,
              updateFn: (delta: number) => void) {
    this._em = entityManager;
    this._scheduler = scheduler;
    this._components = new Map<EntityId, CRender>();
    this._parallaxComponents = new Map<EntityId, CParallax>();
    this._screenSpaceComponents = new Map<EntityId, CRender>();

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    PIXI.settings.ROUND_PIXELS = true;
    PIXI.settings.SORTABLE_CHILDREN = true;

    this._pixi = new PIXI.Application({
      antialias: false
    });
    this._pixi.ticker.maxFPS = CLIENT_FRAME_RATE;
    this._pixi.ticker.add(updateFn);
  }

  addChildToEntity(id: EntityId, childId: EntityId) {}

  removeChildFromEntity(id: EntityId, childId: EntityId) {}

  get viewW() {
    return this._viewW;
  }

  get viewH() {
    return this._viewH;
  }

  get cameraX() {
    return this._camera.x;
  }

  get cameraY() {
    return this._camera.y;
  }

  async initialise() {
    const resource = await this._loadResource("sprite_sheet",
                                              "assets/sprite_sheet.json");
    if (!resource || !resource.spritesheet) {
      throw new GameError("Sprite sheet not loaded");
    }
    this._spriteSheet = resource.spritesheet;
  }

  setWorldSize(worldW: number, worldH: number) {
    this._spatialContainer = new SpatialContainer(worldW, worldH);
  }

  get ready(): boolean {
    return this._spatialContainer !== undefined &&
           this._spriteSheet !== undefined;
  }

  getCanvas() {
    return this._pixi.view;
  }

  setCameraPosition(x: number, y: number) {
    if (Math.abs(x - this._camera.x) < 0.1 &&
        Math.abs(y - this._camera.y) < 0.1) {
      return;
    }

    this._camera = { x, y };

    // Screen origin in world space
    this._viewX = this._camera.x - 0.5 * this._viewW;
    this._viewY = this._camera.y - 0.5 * this._viewH;

    const scale = this._windowH / this._viewH;

    this._pixi.stage.x = -this._viewX * scale;
    this._pixi.stage.y = -this._viewY * scale;

    this._updateScreenSpaceComponentPositions();
    this._computeParallaxOffsets();
  }

  async addImage(name: string, url: string) {
    if (!this._textures.has(name)) {
      const resource = await this._loadResource(name,
                                                url,
                                                PIXI.LoaderResource
                                                    .LOAD_TYPE.IMAGE);
      this._textures.set(name, resource.texture);
    }
  }

  updateComponent(packet: ComponentPacket) {}

  numComponents() {
    return this._components.size;
  }

  getSpriteComponent(id: EntityId): CSprite {
    const c = this.getComponent(id);
    if (!(c instanceof CSprite)) {
      throw new GameError(`Render component (id=${id}) is not of type SPRITE`);
    }
    return <CSprite>c;
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
        if (c.activeAnimation === anim) {
          anim.setEndFrameFnHandle = this._scheduler.addFunction(() => {
            if (this.hasComponent(entityId)) {
              this.setCurrentImage(entityId, anim.endFrame || "");
            }
          }, anim.endFrameDelayMs || 100);
        }
      }
    }

    return true;
  }

  addStaticImage(entityId: EntityId, image: StaticImage) {
    const c = this.getSpriteComponent(entityId);
    if (!c.staticImages.find(i => i.name === image.name)) {
      c.staticImages.push(image);

      const sprite = this._makeSpriteFromImageDesc(image, c.zIndex);
      c.staticSprites.set(image.name, sprite);

      this._addInteractionCallbacks(c, sprite);
    }
  }

  setCurrentImage(entityId: EntityId, name: string) {
    const c = this.getComponent(entityId);
    if (c instanceof CSprite) {
      this._spriteCompSetActiveSprite(c, name, false);
    }
    else if (c instanceof CTiledRegion) {
      this._tiledRegionCompSetActiveSprite(c, name);
    }
    else {
      throw new GameError(`Cannot set image on component of type ${typeof c}`);
    }
  }

  addComponent(component: CRender) {
    this._components.set(component.entityId, component);

    if (component instanceof CSprite) {
      this._addSpriteComponent(component);

      if (component instanceof CParallax) {
        this._parallaxComponents.set(component.entityId, component);
      }
    }
    else if (component instanceof CTiledRegion) {
      this._addTiledRegionComponent(component);
    }
    else if (component instanceof CShape) {
      this._addShapeComponent(component);
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
    const c = this._components.get(id);
    if (c instanceof CSprite) {
      this._removeSpriteComponent(c);

      if (c instanceof CParallax) {
        this._parallaxComponents.delete(id);
      }
    }
    else if (c instanceof CTiledRegion) {
      this._removeTiledRegionComponent(c);
    }
    else if (c instanceof CShape) {
      this._removeShapeComponent(c);
    }
    if (this._spatialContainer) {
      this._spatialContainer.removeEntity(id);
    }
  }

  handleEvent(event: GameEvent) {
    switch (event.type) {
      case GameEventType.ENTITY_MOVED: {
        const ev = <EEntityMoved>event;
        this._onEntityMoved(ev.entityId);
        break;
      }
    }
  }

  update() {
    if (this.ready) {
      this._doCull();
    }
  }

  setScreenPosition(entityId: EntityId, x: number, y: number) {
    const c = this.getComponent(entityId);
    this._screenSpaceComponents.set(entityId, c);
    c.screenPosition = { x, y };
    this._setScreenPosition(c);
  }

  setSpriteSize(entityId: EntityId, width: number, height: number) {
    const c = this.getSpriteComponent(entityId);
    c.staticSprites.forEach(sprite => {
      sprite.width = width;
      sprite.height = height;
    });
    c.animatedSprites.forEach(anim => {
      anim.sprite.width = width;
      anim.sprite.height = height;
    });
  }

  onWindowResized(w: number, h: number) {
    this._windowW = w;
    this._windowH = h;

    const aspect = w / this._windowH;
    this._viewW = this._viewH * aspect;

    this._pixi.renderer.resize(w, h);

    const scale = h / VERTICAL_RESOLUTION;

    this._pixi.stage.scale.x = scale;
    this._pixi.stage.scale.y = scale;

    this._doCull();
  }

  private _doCull() {
    if (!this._spatialContainer) {
      throw new GameError("Render system not initialised");
    }

    const visible = this._spatialContainer.entitiesInRegion(this._viewX,
                                                            this._viewY,
                                                            this._viewW,
                                                            this._viewH);

    this._prevVisible.forEach(id => {
      if (!visible.has(id)) {
        const c = this._components.get(id);
        if (c) {
          this._hide(c);
        }
      }
    });

    visible.forEach(id => {
      if (!this._prevVisible.has(id)) {
        const c = this._components.get(id);
        if (c) {
          this._show(c);
        }
      }
    });

    this._prevVisible = new Set<EntityId>(visible);
  }

  private _hide(c: CRender) {
    if (c instanceof CSprite) {
      if (c.stagedSprite) {
        this._pixi.stage.removeChild(c.stagedSprite);
      }
    }
    else if (c instanceof CShape) {
      this._pixi.stage.removeChild(c.graphics);
    }
    else if (c instanceof CTiledRegion) {
      if (c.stagedSprites) {
        const sprites = c.sprites.get(c.stagedSprites) || [];
        sprites.forEach(sprite => this._pixi.stage.removeChild(sprite));
      }
    }
  }

  private _show(c: CRender) {
    if (c instanceof CSprite) {
      if (c.stagedSprite) {
        this._pixi.stage.addChild(c.stagedSprite);
      }
    }
    else if (c instanceof CShape) {
      this._pixi.stage.addChild(c.graphics);
    }
    else if (c instanceof CTiledRegion) {
      if (c.stagedSprites) {
        const sprites = c.sprites.get(c.stagedSprites) || [];
        sprites.forEach(sprite => this._pixi.stage.addChild(sprite));
      }
    }
  }

  private _stageDrawable(entityId: EntityId, drawable: PIXI.DisplayObject) {
    if (this._prevVisible.has(entityId)) {
      this._pixi.stage.addChild(drawable);
    }
  }

  private _unstageDrawable(drawable: PIXI.DisplayObject) {
    this._pixi.stage.removeChild(drawable);
  }

  private _updateScreenSpaceComponentPositions() {
    this._screenSpaceComponents.forEach(c => {
      this._setScreenPosition(c);
    });
  }

  private _makeSpriteFromImageDesc(image: StaticImage,
                                   zIndex: number) {
    const texture = this._findTexture(image.name);
    const sprite = new PIXI.Sprite(texture);
    sprite.zIndex = DEFAULT_Z_INDEX + zIndex;
    if (image.width) {
      sprite.width = image.width;
    }
    if (image.height) {
      sprite.height = image.height;
    }
    return sprite;
  }

  private _computeParallaxOffsets() {
    this._parallaxComponents.forEach(c => {
      const spatial = <CSpatial>this._em.getComponent(ComponentType.SPATIAL,
                                                      c.entityId);
      if (c.stagedSprite) {
        const x = spatial.x_abs;
        const y = spatial.y_abs;
        const w = c.stagedSprite.width;
        const h = c.stagedSprite.height;
        const centreX = x + 0.5 * w;
        const centreY = y + 0.5 * h;
        const dx = this._camera.x - centreX;
        const dy = this._camera.y - centreY;
        const m = (MAX_PARALLAX_DEPTH - c.depth) / MAX_PARALLAX_DEPTH;
        const newCentreX = this._camera.x - m * dx;
        const newCentreY = this._camera.y - m * dy;
        this._setDrawablePosition(
          c.entityId,
          c.stagedSprite,
          newCentreX - 0.5 * w + c.stagedSprite.pivot.x,
          newCentreY - 0.5 * h + c.stagedSprite.pivot.y);
        c.stagedSprite.zIndex = DEFAULT_Z_INDEX - 100 * c.depth + c.zIndex;
      }
    });
  }

  private _setDrawablePosition(entityId: EntityId,
                               drawable: PIXI.DisplayObject,
                               x: number,
                               y: number,
                               rotation?: number) {
    if (!this._spatialContainer) {
      throw new GameError("Render system not initialised");
    }

    this._spatialContainer.removeEntity(entityId);
    drawable.position.set(x, y);
    if (rotation !== undefined) {
      drawable.rotation = rotation;
    }
    this._spatialContainer.addEntity(entityId, x, y);
  }

  private _setDrawablePositions(entityId: EntityId,
                                drawables: DrawablePosition[]) {
    if (!this._spatialContainer) {
      throw new GameError("Render system not initialised");
    }

    this._spatialContainer.removeEntity(entityId);
    for (const { x, y, rotation, drawable } of drawables) {
      drawable.position.set(x, y);
      if (rotation !== undefined) {
        drawable.rotation = rotation;
      }
      this._spatialContainer.addEntity(entityId, x, y);
    }
  }

  private _addShapeComponent(c: CShape) {
    this._addInteractionCallbacks(c, c.graphics);

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

    //this._pixi.stage.addChild(c.graphics);
    this._stageDrawable(c.entityId, c.graphics);

    this._updateSpritePosition(c);

    if (c.screenPosition) {
      this._screenSpaceComponents.set(c.entityId, c);
    }
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

  private _removeShapeComponent(c: CShape) {
    this._unstageDrawable(c.graphics);
    this._components.delete(c.entityId);
    this._screenSpaceComponents.delete(c.entityId);
  }

  private _addInteractionCallbacks(c: CRender,
                                   sprite: PIXI.DisplayObject) {
    if (c.onPress) {
      sprite.interactive = true;
      sprite.on("mousedown", c.onPress);
      sprite.on("touchstart", c.onPress);
    }
    if (c.onRelease) {
      sprite.interactive = true;
      sprite.on("mouseup", c.onRelease);
      sprite.on("touchend", c.onRelease);
    }
  }

  private _addSpriteComponent(c: CSprite) {
    c.animDescs.forEach(anim => {
      if (!this._spriteSheet) {
        throw new GameError("Sprite sheet not set");
      }

      const textures = this._spriteSheet.animations[anim.name];
      const sprite = new PIXI.AnimatedSprite(textures);
      sprite.zIndex = DEFAULT_Z_INDEX + c.zIndex;
      this._addInteractionCallbacks(c, sprite);

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
      const sprite = this._makeSpriteFromImageDesc(imgDesc, c.zIndex);
      c.staticSprites.set(imgDesc.name, sprite);
      this._addInteractionCallbacks(c, sprite);
    });

    this._spriteCompSetActiveSprite(c, c.initialImage, false);

    if (c.screenPosition) {
      this._screenSpaceComponents.set(c.entityId, c);
    }
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

  private _removeSpriteComponent(c: CSprite) {
    if (c.stagedSprite) {
      this._unstageDrawable(c.stagedSprite);
    }
    this._components.delete(c.entityId);
    this._screenSpaceComponents.delete(c.entityId);
  }

  private _removeTiledRegionComponent(c: CTiledRegion) {
    if (c.stagedSprites !== null) {
      const sprites = c.sprites.get(c.stagedSprites);

      if (sprites) {
        sprites.forEach(sprite => {
          this._unstageDrawable(sprite);
        });
      }
    }

    this._components.delete(c.entityId);
  }

  private _addTiledRegionComponent(c: CTiledRegion) {
    c.staticImages.forEach(imgDesc => {
      const texture = this._findTexture(imgDesc.name);
      const sprites: PIXI.TilingSprite[] = [];
      const drawablePositions: DrawablePosition[] = [];

      for (const [j, spans] of c.region.spans) {
        for (const span of spans) {
          const x = span.a * BLOCK_SZ;
          const y = j * BLOCK_SZ;
          const n = span.b - span.a + 1;

          const sprite = new PIXI.TilingSprite(texture, n * BLOCK_SZ, BLOCK_SZ);
          this._addInteractionCallbacks(c, sprite);
          sprite.zIndex = DEFAULT_Z_INDEX + c.zIndex;
          sprite.position.set(x, y);
          sprites.push(sprite);

          drawablePositions.push({
            x,
            y,
            drawable: sprite
          });
        }
      }

      this._setDrawablePositions(c.entityId, drawablePositions);

      c.sprites.set(imgDesc.name, sprites);
    });

    this._tiledRegionCompSetActiveSprite(c, c.initialImage);
  }

  private _onEntityMoved(id: EntityId) {
    if (this.hasComponent(id)) {
      const c = this.getComponent(id);
      this._setWorldPosition(c);
    }

    const children = this._em.getEntityChildren(id);
    children.forEach(child => this._onEntityMoved(child));
  }

  private _updateSpritePosition(c: CRender) {
    if (c.screenPosition) {
      this._setScreenPosition(c);
    }
    else {
      this._setWorldPosition(c);
    }
  }

  private _setWorldPosition(c: CRender) {
    const spatialComp = <CSpatial>this._em.getComponent(ComponentType.SPATIAL,
                                                        c.entityId);
    if (c instanceof CSprite) {
      if (c.stagedSprite) {
        // TODO: Shouldn't always assume pivot point
        c.stagedSprite.pivot.set(BLOCK_SZ * 0.5, BLOCK_SZ * 0.5);
        // The pivot needs to be added here to keep the position the same
        this._setDrawablePosition(c.entityId,
                                  c.stagedSprite,
                                  spatialComp.x_abs + c.stagedSprite.pivot.x,
                                  spatialComp.y_abs + c.stagedSprite.pivot.y,
                                  spatialComp.angle_abs);
      }
    }
    else if (c instanceof CShape) {
      c.graphics.pivot.set(BLOCK_SZ * 0.5, BLOCK_SZ * 0.5);
      this._setDrawablePosition(c.entityId,
                                c.graphics,
                                spatialComp.x_abs + c.graphics.pivot.x,
                                spatialComp.y_abs + c.graphics.pivot.y,
                                spatialComp.angle_abs);
    }
  }

  private _setScreenPosition(c: CRender) {
    const viewX = this._camera.x - 0.5 * this._viewW;
    const viewY = this._camera.y - 0.5 * this._viewH;

    if (c instanceof CSprite) {
      if (c.stagedSprite && c.screenPosition) {
        this._setDrawablePosition(c.entityId,
                                  c.stagedSprite,
                                  viewX + c.screenPosition.x,
                                  viewY + c.screenPosition.y);
      }
    }
    else if (c instanceof CShape) {
      if (c.screenPosition) {
        this._setDrawablePosition(c.entityId,
                                  c.graphics,
                                  viewX + c.screenPosition.x,
                                  viewY + c.screenPosition.y);
      }
    }
  }

  private _spriteCompSetActiveSprite(c: CSprite,
                                     name: string,
                                     animated: boolean) {
    if (c.stagedSprite) {
      this._unstageDrawable(c.stagedSprite);
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
      //this._pixi.stage.addChild(anim.sprite);
      this._stageDrawable(c.entityId, anim.sprite);
      c.stagedSprite = anim.sprite;
      c.activeAnimation = anim;
    }
    else {
      const sprite = c.staticSprites.get(name);
      if (!sprite) {
        throw new GameError("Component has no sprite with name " + name);
      }
      //this._pixi.stage.addChild(sprite);
      this._stageDrawable(c.entityId, sprite);
      c.stagedSprite = sprite;
    }

    this._updateSpritePosition(c);
  }

  private _tiledRegionCompSetActiveSprite(c: CTiledRegion,
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
      //this._pixi.stage.addChild(sprite);
      this._stageDrawable(c.entityId, sprite);
    });
    c.stagedSprites = name;
  }
}
