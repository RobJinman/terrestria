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
  currentSprite: PIXI.Sprite|null = null;
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
  currentSprites: string|null = null; // Key into the sprites map

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
  private _visible = new Set<PIXI.DisplayObject>();

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

  get fps() {
    return this._pixi.ticker.FPS; 
  }

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

    this._setCameraPosition(x, y);
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

  setVisible(id: EntityId, visible: boolean) {
    const c = this.getComponent(id);
    if (c instanceof CSprite) {
      c.staticSprites.forEach(sprite => sprite.visible = visible);
      c.animatedSprites.forEach(anim => anim.sprite.visible = visible);
    }
    else if (c instanceof CShape) {
      c.graphics.visible = visible;
    }
    else {
      throw new GameError("Can't set visibility on component of that type");
    }
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
    this._components.delete(id);
    this._screenSpaceComponents.delete(id);
    this._parallaxComponents.delete(id);

    if (this._spatialContainer) {
      this._spatialContainer.removeAllItemsForEntity(id);
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

    this._setCameraPosition(this._camera.x, this._camera.y);
    this._doCull();
  }

  private _setCameraPosition(x: number, y: number) {
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

  private _doCull() {
    if (!this._spatialContainer) {
      throw new GameError("Render system not initialised");
    }

    const newVisible = this._spatialContainer.itemsInRegion(this._viewX,
                                                            this._viewY,
                                                            this._viewW,
                                                            this._viewH);

    this._visible.forEach(item => {
      if (!newVisible.has(item)) {
        this._pixi.stage.removeChild(item);
      }
    });

    newVisible.forEach(item => {
      if (!this._visible.has(item)) {
        this._pixi.stage.addChild(item);
      }
    });

    this._visible = new Set<PIXI.DisplayObject>(newVisible);
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
      if (c.currentSprite) {
        const x = spatial.x_abs;
        const y = spatial.y_abs;
        const w = c.currentSprite.width;
        const h = c.currentSprite.height;
        const centreX = x + 0.5 * w;
        const centreY = y + 0.5 * h;
        const dx = this._camera.x - centreX;
        const dy = this._camera.y - centreY;
        const m = (MAX_PARALLAX_DEPTH - c.depth) / MAX_PARALLAX_DEPTH;
        const newCentreX = this._camera.x - m * dx;
        const newCentreY = this._camera.y - m * dy;
        this._stageDrawable(
          c.entityId,
          c.currentSprite,
          true,
          newCentreX - 0.5 * w + c.currentSprite.pivot.x,
          newCentreY - 0.5 * h + c.currentSprite.pivot.y,
          w,
          h);
        c.currentSprite.zIndex = DEFAULT_Z_INDEX - 100 * c.depth + c.zIndex;
      }
    });
  }

  private _stageDrawable(entityId: EntityId,
                         drawable: PIXI.DisplayObject,
                         removeOtherDrawables: boolean,
                         x: number,
                         y: number,
                         w: number,
                         h: number,
                         rotation?: number) {
    if (!this._spatialContainer) {
      throw new GameError("Render system not initialised");
    }

    drawable.position.set(x, y);
    if (rotation !== undefined) {
      drawable.rotation = rotation;
    }

    // TODO: Recompute w and h given rotation

    if (removeOtherDrawables) {
      this._spatialContainer.removeAllItemsForEntity(entityId);
    }

    this._spatialContainer.addItem(entityId, drawable, x, y, w, h);
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

  private _addTiledRegionComponent(c: CTiledRegion) {
    c.staticImages.forEach(imgDesc => {
      const texture = this._findTexture(imgDesc.name);
      const sprites: PIXI.TilingSprite[] = [];

      for (const [j, spans] of c.region.spans) {
        for (const span of spans) {
          const x = span.a * BLOCK_SZ;
          const y = j * BLOCK_SZ;
          const n = span.b - span.a + 1;

          const sprite = new PIXI.TilingSprite(texture, n * BLOCK_SZ, BLOCK_SZ);
          this._addInteractionCallbacks(c, sprite);
          this._stageDrawable(c.entityId,
                              sprite,
                              false,
                              x,
                              y,
                              span.size() * BLOCK_SZ,
                              BLOCK_SZ);
          sprite.zIndex = DEFAULT_Z_INDEX + c.zIndex;
          sprites.push(sprite);
        }
      }

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
      if (c.currentSprite) {
        // TODO: Shouldn't always assume pivot point
        c.currentSprite.pivot.set(BLOCK_SZ * 0.5, BLOCK_SZ * 0.5);
        // The pivot needs to be added here to keep the position the same
        this._stageDrawable(c.entityId,
                            c.currentSprite,
                            true,
                            spatialComp.x_abs + c.currentSprite.pivot.x,
                            spatialComp.y_abs + c.currentSprite.pivot.y,
                            c.currentSprite.width,
                            c.currentSprite.height,
                            spatialComp.angle_abs);
      }
    }
    else if (c instanceof CShape) {
      c.graphics.pivot.set(BLOCK_SZ * 0.5, BLOCK_SZ * 0.5);
      this._stageDrawable(c.entityId,
                          c.graphics,
                          true,
                          spatialComp.x_abs + c.graphics.pivot.x,
                          spatialComp.y_abs + c.graphics.pivot.y,
                          c.graphics.width,
                          c.graphics.height,
                          spatialComp.angle_abs);
    }
  }

  private _setScreenPosition(c: CRender) {
    const viewX = this._camera.x - 0.5 * this._viewW;
    const viewY = this._camera.y - 0.5 * this._viewH;

    if (c instanceof CSprite) {
      if (c.currentSprite && c.screenPosition) {
        this._stageDrawable(c.entityId,
                            c.currentSprite,
                            true,
                            viewX + c.screenPosition.x,
                            viewY + c.screenPosition.y,
                            c.currentSprite.width,
                            c.currentSprite.height);
      }
    }
    else if (c instanceof CShape) {
      if (c.screenPosition) {
        this._stageDrawable(c.entityId,
                            c.graphics,
                            true,
                            viewX + c.screenPosition.x,
                            viewY + c.screenPosition.y,
                            c.graphics.width,
                            c.graphics.height);
      }
    }
  }

  private _spriteCompSetActiveSprite(c: CSprite,
                                     name: string,
                                     animated: boolean) {
    if (c.activeAnimation) {
      const endFrameFnHandle = c.activeAnimation.setEndFrameFnHandle;
      this._scheduler.removeFunction(endFrameFnHandle);
    }

    if (animated) {       
      const anim = c.animatedSprites.get(name);
      if (!anim) {
        throw new GameError("Component has no sprite with name " + name);
      }
      c.currentSprite = anim.sprite;
      c.activeAnimation = anim;
    }
    else {
      const sprite = c.staticSprites.get(name);
      if (!sprite) {
        throw new GameError("Component has no sprite with name " + name);
      }
      c.currentSprite = sprite;
    }

    this._updateSpritePosition(c);
  }

  private _tiledRegionCompSetActiveSprite(c: CTiledRegion,
                                          name: string) {

    if (this._spatialContainer) {
      this._spatialContainer.removeAllItemsForEntity(c.entityId);
    }

    c.currentSprites = name;

    const sprites = c.sprites.get(c.currentSprites);
    if (sprites) {
      for (const sprite of sprites) {
        this._stageDrawable(c.entityId,
                            sprite,
                            false,
                            sprite.x,
                            sprite.y,
                            sprite.width,
                            BLOCK_SZ);
      }
    }
  }
}
