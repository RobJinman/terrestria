import * as PIXI from 'pixi.js';
import { EntityManager } from "./common/entity_manager";
import { GameError } from "./common/error";
import { GameEvent, GameEventType, EEntityMoved } from "./common/event";
import { ResourcesMap } from "./definitions";
import { ComponentType } from "./common/component_types";
import { SpatialComponent } from "./common/spatial_system";
import { ClientSystem } from './common/client_system';
import { Component, EntityId, ComponentPacket } from './common/system';

export class RenderComponent extends Component {
  imageResourceName: string = "";
  sprite?: PIXI.Sprite;

  constructor(entityId: EntityId, imageResourceName: string) {
    super(entityId, ComponentType.RENDER);
    this.imageResourceName = imageResourceName;
  }
}

export class RenderSystem implements ClientSystem {
  private _components: Map<number, RenderComponent>;
  private _em: EntityManager;
  private _pixi: PIXI.Application;
  private _resources: ResourcesMap = {};

  constructor(entityManager: EntityManager, pixi: PIXI.Application) {
    this._em = entityManager;
    this._pixi = pixi;
    this._components = new Map<number, RenderComponent>();
  }

  setResources(resources: ResourcesMap) {
    this._resources = resources;
  }

  updateComponent(packet: ComponentPacket) {}

  numComponents() {
    return this._components.size;
  }

  addComponent(component: RenderComponent) {
    this._components.set(component.entityId, component);

    const resource = this._getResource(component.imageResourceName);
    resource.texture.rotate = 8;
    component.sprite = new PIXI.Sprite(resource.texture);

    this._onEntityMoved(component.entityId);

    this._pixi.stage.addChild(component.sprite);
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
    if (c && c.sprite) {
      this._pixi.stage.removeChild(c.sprite);
    }

    this._components.delete(id);
  }

  getUnverified() {
    return [];
  }

  private _onEntityMoved(id: EntityId) {
    if (this.hasComponent(id)) {
      const spatialComp =
        <SpatialComponent>this._em.getComponent(ComponentType.SPATIAL, id);

      const renderComp = this.getComponent(id);
      if (renderComp.sprite) {
        renderComp.sprite.x = spatialComp.x;
        renderComp.sprite.y = spatialComp.y;
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

  private _getResource(name: string) {
    const val = this._resources[name];
    if (!val) {
      throw new Error(`No resource with name '${name}'`);
    }
    return val;
  }
}
