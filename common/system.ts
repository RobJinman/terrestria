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
  abstract removeComponent(id: EntityId): void;
  abstract numComponents(): number;
  abstract handleEvent(event: GameEvent): void;
  abstract update(): void;
}
