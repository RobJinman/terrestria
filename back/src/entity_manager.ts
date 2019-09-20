import { GameError } from "./error";
import { ComponentType } from "./component_types";

export type EntityId = number;

let nextEntityId = 0;

export function getNextEntityId() {
  return ++nextEntityId;
}

export abstract class Component {
  private _entityId: EntityId;

  constructor(entityId: EntityId) {
    this._entityId = entityId;
  }

  get entityId(): EntityId {
    return this._entityId;
  }
}

export abstract class System {
  abstract hasComponent(entityId: EntityId): boolean;
  abstract getComponent(entityId: EntityId): Component;
  abstract addComponent(component: Component): void;
  abstract removeComponent(entityId: EntityId): void;
  abstract numComponents(): number;
  abstract update(): void;
  abstract getDirties(): Component[];
}

export class EntityManager {
  private _systems: Map<number, System>;

  constructor() {
    this._systems = new Map<number, System>();
  }

  addSystem(componentType: ComponentType, system: System) {
    this._systems.set(componentType, system);
  }

  getSystem(componentType: ComponentType) {
    const s = this._systems.get(componentType);
    if (!s) {
      throw new GameError(`No system for component type ${componentType}`);
    }
    return s;
  }

  removeEntity(entityId: EntityId) {
    console.log(`Deleting entity ${entityId}`);
    this._systems.forEach(sys => sys.removeComponent(entityId));
  }
}
