import { Component, EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { ServerEntityManager } from "./server_entity_manager";

export class AgentComponent extends Component {
  dirty: boolean = true;
  private _pinataId: string;
  private _pinataToken: string;

  constructor(entityId: EntityId, pinataId: string, pinataToken: string) {
    super(entityId, ComponentType.AGENT);
    
    this._pinataId = pinataId;
    this._pinataToken = pinataToken;
  }

  get pinataId() {
    return this._pinataId;
  }

  get pinataToken() {
    return this._pinataToken;
  }
}

export class AgentSystem implements ServerSystem {
  private _components: Map<number, AgentComponent>;
  private _em: ServerEntityManager;

  constructor(em: ServerEntityManager) {
    this._components = new Map<number, AgentComponent>();
    this._em = em;
  }

  numComponents() {
    return this._components.size;
  }

  addComponent(component: AgentComponent) {
    this._components.set(component.entityId, component);
  }

  hasComponent(id: EntityId) {
    return id in this._components;
  }

  getComponent(id: EntityId) {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No agent component for entity ${id}`);
    }
    return c;
  }

  removeComponent(id: EntityId) {
    this._components.delete(id);
  }

  handleEvent(event: GameEvent) {
    // TODO
  }

  update() {
    // TODO
  }

  getState() {
    return [];
  }

  getDirties() {
    return [];
  }
}
