import { Component, ComponentPacket, EntityId } from "./common/system";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { InventoryPacket } from "./common/inventory_packet";

export class Bucket { 
  private _name: string;
  private _max: number;
  private _value: number = 0;

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

  addItem(item: CCollectable): boolean {
    const prevValue = this._value;

    this._value += item.value;
    if (this._max >= 0 && this._value > this._max) {
      this._value = this._max;
    }

    return this._value !== prevValue;
  }

  clear(): boolean {
    if (this._value === 0) {
      return false;
    }
    this._value = 0;
    return true;
  }
}

export enum CInventoryType {
  COLLECTOR = "COLLECTOR",
  COLLECTABLE = "COLLECTABLE"
}

export abstract class CInventory extends Component {
  private _invType: CInventoryType;

  constructor(entityId: EntityId, inventoryType: CInventoryType) {
    super(entityId, ComponentType.INVENTORY);

    this._invType = inventoryType;
  }

  get inventoryType() {
    return this._invType;
  }
}

export class CCollectable extends CInventory {
  private _bucket: string;
  private _value: number;

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
  _buckets: Map<string, Bucket>; // Non-private so InventorySystem has access
  dirty = true;

  constructor(entityId: EntityId) {
    super(entityId, CInventoryType.COLLECTOR);

    this._buckets = new Map<string, Bucket>();
  }

  addBucket(bucket: Bucket) {
    this._buckets.set(bucket.name, bucket);
  }

  collect(item: CCollectable): boolean {
    const bucket = this._getBucket(item.bucket);
    this.dirty = true;
    return bucket.addItem(item);
  }

  clearBucket(bucketName: string): boolean {
    const bucket = this._buckets.get(bucketName);
    if (!bucket) {
      throw new GameError(`Entity has no bucket with name ${bucketName}`);
    }
    this.dirty = true;
    return bucket.clear();
  }

  bucketValue(bucketName: string): number {
    const bucket = this._getBucket(bucketName);
    return bucket.value;
  }

  private _getBucket(bucketName: string): Bucket {
    const bucket = this._buckets.get(bucketName);
    if (!bucket) {
      throw new GameError(`Entity ${this.entityId} does not have ` +
                          `${bucketName} bucket`);
    }
    return bucket;
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

  addChildToEntity(id: EntityId, childId: EntityId) {}

  removeChildFromEntity(id: EntityId, childId: EntityId) {}

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
    const packets: InventoryPacket[] = [];

    this._collectors.forEach((c, id) => {
      packets.push(this._makePacket(c));
    });

    return packets;
  }

  getDirties() {
    const packets: InventoryPacket[] = [];

    this._collectors.forEach((c, id) => {
      if (c.dirty) {
        packets.push(this._makePacket(c));
        c.dirty = false;
      }
    });

    return packets;
  }

  collectItem(collectorId: EntityId, collectableId: EntityId): boolean {
    const collector = this._getCollector(collectorId);
    const collectable = this._getCollectable(collectableId);

    return collector.collect(collectable);
  }

  clearBucket(collectorId: EntityId, bucketName: string): boolean {
    const collector = this._getCollector(collectorId);
    return collector.clearBucket(bucketName);
  }

  private _getCollector(id: EntityId): CCollector {
    const collector = this._collectors.get(id);

    if (!collector) {
      throw new GameError(`No collector with id ${id}`);
    }

    return collector;
  }

  private _getCollectable(id: EntityId): CCollectable {
    const collectable = this._collectables.get(id);

    if (!collectable) {
      throw new GameError(`No collectable with id ${id}`);
    }

    return collectable;
  }

  private _makePacket(c: CCollector): InventoryPacket {
    const buckets = Array.from(c._buckets.entries())
                        .map(([name, bucket]) => ({
      name,
      value: bucket.value,
      max: bucket.max
    }));

    return {
      componentType: ComponentType.INVENTORY,
      entityId: c.entityId,
      buckets
    };
  }
}
