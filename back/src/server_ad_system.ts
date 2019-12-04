import { Component, EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { AdComponentPacket } from "./common/ad_component_packet";

export class ServerAdComponent extends Component {
  dirty: boolean = true;
  readonly adName: string;
  private _adUrl: string|null = null;

  constructor(entityId: EntityId, adName: string) {
    super(entityId, ComponentType.AD);
    this.adName = adName;
  }

  set adUrl(value: string|null) {
    this._adUrl = value;
    this.dirty = true;
  }

  get adUrl() {
    return this._adUrl;
  }
}

export class ServerAdSystem implements ServerSystem {
  private _components = new Map<EntityId, ServerAdComponent>()
  private _ads = new Map<string, ServerAdComponent[]>();
  private _adUrls = new Map<string, string>();

  constructor() {}

  numComponents() {
    return this._components.size;
  }

  addComponent(component: ServerAdComponent) {
    this._components.set(component.entityId, component);

    component.adUrl = this._adUrls.get(component.adName) || null;

    let entities = this._ads.get(component.adName);
    if (entities) {
      entities.push(component);
    }
    else {
      entities = [component];
      this._ads.set(component.adName, entities);
    }
  }

  setAdUrl(name: string, url: string) {
    this._adUrls.set(name, url);

    const ads = this._ads.get(name) || [];
    ads.forEach(c => {
      c.adUrl = url;
    });
  }

  hasComponent(id: EntityId) {
    return this._components.has(id);
  }

  getComponent(id: EntityId) {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No ad component for entity ${id}`);
    }
    return c;
  }

  removeComponent(id: EntityId) {
    this._components.delete(id);
  }

  handleEvent(event: GameEvent) {}

  update() {}

  getState() {
    const packets: AdComponentPacket[] = [];

    this._components.forEach(c => {
      packets.push({
        componentType: ComponentType.AD,
        entityId: c.entityId,
        adName: c.adName,
        adUrl: c.adUrl
      });
    });

    return packets;
  }

  getDirties() {
    const dirties: AdComponentPacket[] = [];

    this._components.forEach(c => {
      if (c.dirty) {
        dirties.push({
          componentType: ComponentType.AD,
          entityId: c.entityId,
          adName: c.adName,
          adUrl: c.adUrl
        });

        c.dirty = false;
      }
    });

    return dirties;
  }
}
