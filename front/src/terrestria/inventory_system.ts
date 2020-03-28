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

interface Bucket {
  name: string;
  value: number;
}

export class CInventory extends Component {
  buckets: Bucket[] = [];
  indicatorIds = new Set<EntityId>();

  constructor(entityId: EntityId) {
    super(entityId, ComponentType.INVENTORY);
  }
}

export class InventorySystem implements ClientSystem {
  private _em: EntityManager;
  private _components: Map<number, CInventory>;

  constructor(em: EntityManager) {
    this._em = em;
    this._components = new Map<number, CInventory>();
  }

  updateComponent(packet: InventoryPacket) {
    const c = this.getComponent(packet.entityId);
    c.buckets = packet.buckets;

    const entity = this._em.getEntity(packet.entityId);

    if (entity.type == EntityType.PLAYER) {
      this._updateIndicators(c);
    }
  }

  update() {}

  addComponent(component: CInventory) {
    this._components.set(component.entityId, component);
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

  private _updateIndicators(c: CInventory) {
    c.indicatorIds.forEach(id => this._em.removeEntity(id));

    c.buckets.forEach(bucket => {
      if (bucket.name == "gems") {
        this._constructGemsIndicator(c, bucket);
      }
    });
  }

  private _constructGemsIndicator(c: CInventory, bucket: Bucket) {
    const spatialComp = this._em.getComponent(ComponentType.SPATIAL,
                                              c.entityId);

    for (let i = 0; i < bucket.value; ++i) {
      const id = this._constructGemsIndicatorDot(<CSpatial>spatialComp, i);
      c.indicatorIds.add(id);
    }
  }

  private _constructGemsIndicatorDot(agentSpatialComp: CSpatial, idx: number) {
    const id = getNextEntityId();

    const w = 10;
    const h = 10;
    const margin = 2;

    const spatialComp = new CSpatial(id, this._em);
    const x = agentSpatialComp.x + (w + margin) * idx;
    const y = agentSpatialComp.y;

    spatialComp.setStaticPos(x, y);

    const renderComp = new CShape(id,
                                  new Rectangle(w, h),
                                  new Colour(1, 0, 0));

    this._em.addEntity(id, EntityType.OTHER, [ spatialComp, renderComp ]);
    return id;
  }
}
