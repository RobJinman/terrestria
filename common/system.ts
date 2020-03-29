import { ComponentType } from "./component_types";
import { GameEvent } from "./event";

export type EntityId = number;

export interface ComponentPacket {
  entityId: EntityId;
  componentType: ComponentType;
}

export abstract class Component {
  private _entityId: EntityId;
  private _type: ComponentType;
  private _isLocalOnly: boolean;

  constructor(entityId: EntityId, type: ComponentType, isLocalOnly = false) {
    this._entityId = entityId;
    this._type = type;
    this._isLocalOnly = isLocalOnly;
  }

  get entityId(): EntityId {
    return this._entityId;
  }

  get type(): ComponentType {
    return this._type;
  }

  get isLocalOnly() {
    return this._isLocalOnly;
  }
}

export abstract class System {
  abstract hasComponent(entityId: EntityId): boolean;
  abstract getComponent(entityId: EntityId): Component;
  abstract addComponent(component: Component): void;
  abstract removeComponent(id: EntityId): void;
  abstract numComponents(): number;
  abstract handleEvent(event: GameEvent): void;
  abstract update(): void;
}
