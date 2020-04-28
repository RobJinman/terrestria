import { EntityId, Component } from "./common/system";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { ClientSystem } from "./common/client_system";
import { ComponentType } from "./common/component_types";
import { InventoryPacket } from "./common/inventory_packet";
import { EntityManager, getNextEntityId } from "./entity_manager";
import { CShape, Colour } from "./render_system";
import { Rectangle } from "./common/geometry";
import { EntityType } from "./common/game_objects";
import { CSpatial } from "./spatial_component";
import { PLAYER_BUCKET_VALUE_Z_INDEX } from "./constants";
import { SpatialSystem } from "./spatial_system";
import { BLOCK_SZ_WLD } from "./common/constants";
import { toPixels } from "./utils";

interface Bucket {
  name: string;
  value: number;
  max: number;
}

export class CInventory extends Component {
  buckets: Map<string, Bucket> = new Map<string, Bucket>();
  indicatorIds = new Set<EntityId>();

  constructor(entityId: EntityId) {
    super(entityId, ComponentType.INVENTORY);
  }
}

export class InventorySystem implements ClientSystem {
  private _em: EntityManager;
  private _components: Map<number, CInventory>;
  private _displayedBucket?: string;

  constructor(em: EntityManager) {
    this._em = em;
    this._components = new Map<number, CInventory>();
  }

  addChildToEntity(id: EntityId, childId: EntityId) {}

  removeChildFromEntity(id: EntityId, childId: EntityId) {}

  setDisplayedBucket(bucketName: string) {
    this._displayedBucket = bucketName;
  }

  updateComponent(packet: InventoryPacket) {
    const c = this.getComponent(packet.entityId);
    c.buckets.clear();
    packet.buckets.forEach(bucket => c.buckets.set(bucket.name, bucket));

    const entity = this._em.getEntity(packet.entityId);

    if (this._displayedBucket && entity.type == EntityType.PLAYER) {
      this._updateBucketDisplay(c);
    }
  }

  update() {}

  addComponent(component: CInventory) {
    this._components.set(component.entityId, component);

    const entity = this._em.getEntity(component.entityId);
    if (this._displayedBucket && entity.type == EntityType.PLAYER) {
      this._updateBucketDisplay(component);
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
  }

  numComponents() {
    return this._components.size;
  }

  handleEvent(event: GameEvent) {}

  private _updateBucketDisplay(c: CInventory) {
    c.indicatorIds.forEach(id => this._em.removeEntity(id));
    c.indicatorIds.clear();

    c.buckets.forEach(bucket => {
      if (bucket.name == this._displayedBucket) {
        this._constructBucketDisplay(c, bucket);
      }
    });
  }

  private _constructBucketDisplay(c: CInventory, bucket: Bucket) {
    for (let i = 0; i < bucket.value; ++i) {
      const id = this._constructBucketDisplayDot(c, i);
      c.indicatorIds.add(id);
    }
  }

  private _constructBucketDisplayDot(agent: CInventory, idx: number) {
    if (!this._displayedBucket) {
      throw new GameError("No display bucket set");
    }

    const bucket = agent.buckets.get(this._displayedBucket);
    if (!bucket) {
      throw new GameError(`No bucket with name ${this._displayedBucket}`);
    }

    const n = bucket.max;
    const w = 0.8 * BLOCK_SZ_WLD / n;
    const margin = (BLOCK_SZ_WLD - w * n) / n;
    const h = w;

    const id = getNextEntityId();

    const spatialSys = <SpatialSystem>this._em.getSystem(ComponentType.SPATIAL);

    const spatialComp = new CSpatial(id, this._em);
    const renderComp = new CShape(id,
                                  new Rectangle(toPixels(w), toPixels(h)),
                                  new Colour(1, 0, 0),
                                  { zIndex: PLAYER_BUCKET_VALUE_Z_INDEX });

    this._em.addEntity(id, EntityType.OTHER, [ spatialComp, renderComp ]);

    const x = (w + margin) * idx;
    const y = -h - margin;
    spatialSys.setStaticPos(id, x, y);

    this._em.addChildToEntity(agent.entityId, id);

    return id;
  }
}
