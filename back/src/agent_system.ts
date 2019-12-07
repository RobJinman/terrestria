import { Component, EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { ServerEntityManager } from "./server_entity_manager";
import { Pinata, CreateAwardResponse } from "./pinata";

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
  private _pinata: Pinata;

  constructor(em: ServerEntityManager, pinata: Pinata) {
    this._components = new Map<number, AgentComponent>();
    this._em = em;
    this._pinata = pinata;
  }

  async grantAward(entityId: EntityId,
                   name: string): Promise<CreateAwardResponse> {
    const c = this.getComponent(entityId);
    const response = await this._pinata.grantAward(name, c.pinataToken);
    return response;
  }

  numComponents() {
    return this._components.size;
  }

  addComponent(component: AgentComponent) {
    this._components.set(component.entityId, component);
  }

  hasComponent(id: EntityId) {
    return this._components.has(id);
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
