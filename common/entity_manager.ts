import { GameError } from "./error";
import { ComponentType } from "./component_types";
import { GameEvent } from "./event";
import { EntityType } from "./game_objects";

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
  private _type: ComponentType;

  constructor(entityId: EntityId, type: ComponentType) {
    this._entityId = entityId;
    this._type = type;
  }

  get entityId(): EntityId {
    return this._entityId;
  }

  get type(): ComponentType {
    return this._type;
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
  abstract getState(): ComponentPacket[];

  // Client
  abstract updateComponent(packet: ComponentPacket): void;
}

export interface Entity {
  id: EntityId;
  type: EntityType;
}

export class EntityManager {
  private _systems: Map<ComponentType, System>;
  private _entities: Map<EntityId, Entity>;

  constructor() {
    this._systems = new Map<ComponentType, System>();
    this._entities = new Map<EntityId, Entity>();
  }

  addEntity(id: EntityId, type: EntityType, components: Component[]) {
    this._entities.set(id, { id, type });
    components.forEach(c => {
      const sys = this.getSystem(c.type);
      sys.addComponent(c);
    });
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

  getComponent(componentType: ComponentType, entityId: EntityId) {
    const sys = this.getSystem(componentType);
    return sys.getComponent(entityId);
  }

  entities(): Entity[] {
    return Array.from(this._entities.values());
  }

  removeEntity(entityId: EntityId) {
    console.log(`Deleting entity ${entityId}`);
    this._systems.forEach(sys => sys.removeComponent(entityId));
    this._entities.delete(entityId);
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

  getState(): ComponentPacket[] {
    let packets: ComponentPacket[] = [];
    this._systems.forEach(sys => packets.push(...sys.getState()));

    return packets;
  }
}
