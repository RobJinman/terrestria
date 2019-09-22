import { GameError } from "./error";
import { ComponentType } from "./component_types";
import { GameEvent } from "./event";

export type EntityId = number;

let nextEntityId = 0;

export function getNextEntityId() {
  return ++nextEntityId;
}

export interface ComponentPacket {
  entityId: EntityId;
  componentType: ComponentType;
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

  // Server
  abstract update(): void;
  abstract handleEvent(event: GameEvent): void;
  abstract getDirties(): ComponentPacket[];

  // Client
  abstract updateComponent(packet: ComponentPacket): void;
}

export class EntityManager {
  private _systems: Map<ComponentType, System>;

  constructor() {
    this._systems = new Map<ComponentType, System>();
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

  hasEntity(entityId: EntityId) {
    this._systems.forEach(sys => {
      if (sys.hasComponent(entityId)) {
        return true;
      }
    })
    return false;
  }

  removeEntity(entityId: EntityId) {
    console.log(`Deleting entity ${entityId}`);
    this._systems.forEach(sys => sys.removeComponent(entityId));
  }

  postEvent(event: GameEvent) {
    this._systems.forEach(sys => sys.handleEvent(event));
  }

  update() {
    this._systems.forEach(sys => sys.update());
  }

  updateComponent(packet: ComponentPacket) {
    const sys = this.getSystem(packet.componentType);
    sys.updateComponent(packet);
  }

  getDirties(): ComponentPacket[] {
    let dirties: ComponentPacket[] = [];
    this._systems.forEach(sys => dirties.push(...sys.getDirties()));

    return dirties;
  }
}
