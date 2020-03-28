import { GameError } from "./error";
import { ComponentType } from "./component_types";
import { GameEvent } from "./event";
import { EntityType } from "./game_objects";
import { EntityId, System, Component } from "./system";

export interface Entity {
  id: EntityId;
  type: EntityType;
  desc: any;
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
    this.entities.set(id, { id, type, desc });
    components.forEach(c => {
      const sys = this.getSystem(c.type);
      sys.addComponent(c);
    });
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

  getEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  getEntity(id: EntityId): Entity {
    const entity = this.entities.get(id);

    if (!entity) {
      throw new GameError(`No entity with id ${id}`);
    }

    return entity;
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
    this.systems.forEach(sys => sys.removeComponent(id));
    this.entities.delete(id);
  }
}
