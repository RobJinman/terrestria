import { Component, EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { AdvertPacket } from "./common/advert_packet";
import { Pinata, AdSlice } from "./pinata";

export class CAdvert extends Component {
  dirty: boolean = true;
  readonly adName: string;
  private _slices: AdSlice[] = [];
  private _currentSlice = -1;

  constructor(entityId: EntityId, adName: string) {
    super(entityId, ComponentType.AD);
    this.adName = adName;
  }

  set currentSlice(index: number) {
    this.dirty = true;
    this._currentSlice = index;
  }

  get currentSlice() {
    return this._currentSlice;
  }

  set slices(slices: AdSlice[]) {
    this._slices = slices;
    this.dirty = true;
  }

  get adUrl() {
    const n = this._slices.length;
    if (n === 0) {
      return null;
    }
    return this._slices[this._currentSlice % n].url;
  }
}

export class AdvertSystem implements ServerSystem {
  private _components = new Map<EntityId, CAdvert>();
  private _pinata: Pinata;

  constructor(pinata: Pinata) {
    this._pinata = pinata;
  }

  numComponents() {
    return this._components.size;
  }

  addComponent(component: CAdvert) {
    this._components.set(component.entityId, component);

    const region = "GB"; // TODO
    this._pinata.getAdSlices(component.adName, region).then(slices => {
      component.slices = slices;
    }, () => {
      console.error("Error fetching ads from Pinata server");
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
    const packets: AdvertPacket[] = [];

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
    const dirties: AdvertPacket[] = [];

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
