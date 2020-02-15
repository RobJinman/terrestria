import { Component, ComponentPacket, EntityId } from "./common/system";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";

export class Bucket {
  _name: string;
  _max: number;
  _value: number = 0;

  // If max is negative, the bucket has infinite capacity
  constructor(name: string, max: number) {
    this._name = name;
    this._max = max;
  }

  get name() {
    return this._name;
  }

  get max() {
    return this._max;
  }

  get value() {
    return this._value;
  }

  addItem(item: CCollectable) {
    this._value += item.value;
    if (this._max >= 0 && this._value > this._max) {
      this._value = this._max;
    }
  }
}

export enum CInventoryType {
  COLLECTOR = "COLLECTOR",
  COLLECTABLE = "COLLECTABLE"
}

export abstract class CInventory extends Component {
  _invType: CInventoryType;

  constructor(entityId: EntityId, inventoryType: CInventoryType) {
    super(entityId, ComponentType.INVENTORY);

    this._invType = inventoryType;
  }

  get inventoryType() {
    return this._invType;
  }
}

export class CCollectable extends CInventory {
  _bucket: string;
  _value: number;

  constructor(entityId: EntityId, bucket: string, value: number) {
    super(entityId, CInventoryType.COLLECTABLE);

    this._bucket = bucket;
    this._value = value;
  }

  get value() {
    return this._value;
  }

  get bucket() {
    return this._bucket;
  }
}

export class CCollector extends CInventory {
  _buckets: Map<string, Bucket>;

  constructor(entityId: EntityId) {
    super(entityId, CInventoryType.COLLECTOR);

    this._buckets = new Map<string, Bucket>();
  }

  addBucket(bucket: Bucket) {
    this._buckets.set(bucket.name, bucket);
  }

  collect(item: CCollectable) {
    const bucket = this._buckets.get(item.bucket);
    if (!bucket) {
      throw new GameError(`Entity ${this.entityId} does not have ` +
                          `${item.bucket} bucket`);
    }
    bucket.addItem(item);
  }
}

export class InventorySystem implements ServerSystem {
  private _components: Map<number, CInventory>;
  private _collectors: Map<number, CCollector>;
  private _collectables: Map<number, CCollectable>;

  constructor() {
    this._components = new Map<number, CInventory>();
    this._collectors = new Map<number, CCollector>();
    this._collectables = new Map<number, CCollectable>();
  }

  updateComponent(packet: ComponentPacket) {}

  numComponents() {
    return this._components.size;
  }

  addComponent(component: CInventory) {
    this._components.set(component.entityId, component);
    if (component.inventoryType == CInventoryType.COLLECTOR) {
      this._collectors.set(component.entityId, <CCollector>component);
    }
    else if (component.inventoryType == CInventoryType.COLLECTABLE) {
      this._collectables.set(component.entityId, <CCollectable>component);
    }
  }

  hasComponent(id: EntityId) {
    return this._components.has(id);
  }

  getComponent(id: EntityId) {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No inventory component for entity ${id}`);
    }
    return c;
  }

  removeComponent(id: EntityId) {
    this._components.delete(id);
    this._collectors.delete(id);
    this._collectables.delete(id);
  }

  handleEvent(event: GameEvent) {}

  update() {}

  getState() {
    return [];
  }

  getDirties() {
    return [];
  }

  collectItem(collectorId: EntityId, collectableId: EntityId) {
    const collector = this._collectors.get(collectorId);
    const collectable = this._collectables.get(collectableId);

    if (!collector) {
      throw new GameError(`No collector with id ${collectorId}`);
    }
    if (!collectable) {
      throw new GameError(`No collectable with id ${collectableId}`);
    }

    collector.collect(collectable);
  }
}
