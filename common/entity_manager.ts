import { GameError } from "./error";
import { ComponentType } from "./component_types";
import { GameEvent } from "./event";
import { EntityType } from "./game_objects";
import { EntityId, System, Component } from "./system";

export interface EntityData {
  id: EntityId;
  type: EntityType;
  desc: any;
}

export interface Entity extends EntityData {
  parent?: EntityId;
  children: Set<EntityId>;
}

export class IEntityManager {
  protected systems: Map<ComponentType, System>;
  protected entities: Map<EntityId, Entity>;
  private _pendingDeletion: Set<EntityId>;

  constructor() {
    this.systems = new Map<ComponentType, System>();
    this.entities = new Map<EntityId, Entity>();
    this._pendingDeletion = new Set<EntityId>();
  }

  addEntity(id: EntityId,
           type: EntityType,
           desc: any,
           components: Component[]) {
    const children = new Set<EntityId>();

    this.entities.set(id, {
      id,
      type,
      desc,
      children
    });

    components.forEach(c => {
      const sys = this.getSystem(c.type);
      sys.addComponent(c);
    });
  }

  addChildToEntity(id: EntityId, childId: EntityId) {
    const parent = this._getEntity(id);
    const child = this._getEntity(childId);

    parent.children.add(childId);
    child.parent = id;
  }

  getEntityChildren(id: EntityId): EntityId[] {
    return Array.from(this._getEntity(id).children);
  }

  getEntityParent(id: EntityId): EntityId|undefined {
    return this._getEntity(id).parent;
  }

  addSystem(componentType: ComponentType, system: System) {
    this.systems.set(componentType, system);
  }

  getSystem(componentType: ComponentType) {
    const s = this.systems.get(componentType);
    if (!s) {
      throw new GameError(`No system for component type ${componentType}`);
    }
    return s;
  }

  getComponent(componentType: ComponentType, entityId: EntityId) {
    const sys = this.getSystem(componentType);
    return sys.getComponent(entityId);
  }

  getEntities(): EntityData[] {
    return Array.from(this.entities.values())
                .map(({ id, type, desc }) => ({ id, type, desc }));
  }

  getEntity(id: EntityId): EntityData {
    const entity = this.entities.get(id);

    if (!entity) {
      throw new GameError(`No entity with id ${id}`);
    }

    return {
      id: entity.id,
      type: entity.type,
      desc: entity.desc
    };
  }

  hasEntity(id: EntityId) {
    return this.entities.has(id);
  }

  removeEntity(entityId: EntityId) {
    this._pendingDeletion.add(entityId);
  }

  removeAll() {
    this.entities.forEach(entity => this.removeEntity(entity.id));
  }

  postEvent(event: GameEvent) {
    this.systems.forEach(sys => sys.handleEvent(event));
  }

  update() {
    this.systems.forEach(sys => sys.update());
    this._pendingDeletion.forEach(id => this._deleteEntity(id));
    this._pendingDeletion.clear();
  }

  private _deleteEntity(id: EntityId) {
    const entity = this.entities.get(id);
    if (entity) {
      entity.children.forEach(entity => this._deleteEntity(entity));
      entity.children.clear();

      this.systems.forEach(sys => sys.removeComponent(id));
      this.entities.delete(id);

      if (entity.parent) {
        const parent = this._getEntity(entity.parent);
        parent.children.delete(id);
      }
    }
  }

  private _getEntity(id: EntityId) {
    const entity = this.entities.get(id);
    if (!entity) {
      throw new GameError(`No entity with id ${id}`);
    }
    return entity;
  }
}
