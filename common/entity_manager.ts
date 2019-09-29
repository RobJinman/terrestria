import { GameError } from "./error";
import { ComponentType } from "./component_types";
import { GameEvent } from "./event";
import { EntityType } from "./game_objects";
import { EntityId, System, Component } from "./system";

let nextEntityId = 0;

export function getNextEntityId() {
  return ++nextEntityId;
}

export interface Entity {
  id: EntityId;
  type: EntityType;
}

export class EntityManager {
  protected systems: Map<ComponentType, System>;
  protected _entities: Map<EntityId, Entity>;
  private _pendingDeletion: Set<EntityId>;

  constructor() {
    this.systems = new Map<ComponentType, System>();
    this._entities = new Map<EntityId, Entity>();
    this._pendingDeletion = new Set<EntityId>();
  }

  addEntity(id: EntityId, type: EntityType, components: Component[]) {
    this._entities.set(id, { id, type });
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

  entities(): Entity[] {
    return Array.from(this._entities.values());
  }

  removeEntity(entityId: EntityId) {
    console.log(`Entity ${entityId} pending removal`);
    this._pendingDeletion.add(entityId);
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
    console.log(`Deleting entity ${id}`);
    this.systems.forEach(sys => sys.removeComponent(id));
    this._entities.delete(id);
  }
}
