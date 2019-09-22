import { Component, EntityId, System,
         ComponentPacket } from "./entity_manager";
import { GameError } from "./error";
import { ComponentType } from "./component_types";
import { GameEvent } from "./event";

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

export class AgentSystem extends System {
  private _components: Map<number, AgentComponent>;

  constructor() {
    super();

    this._components = new Map<number, AgentComponent>();
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

  updateComponent(packet: ComponentPacket) {
    // TODO
  }

  handleEvent(event: GameEvent) {
    // TODO
  }

  update() {
    // TODO
  }

  getState() {
    const packets: ComponentPacket[] = [];

    this._components.forEach((c, id) => {
      packets.push({
        componentType: ComponentType.AGENT,
        entityId: c.entityId
      });
    });

    return packets;
  }

  getDirties() {
    const dirties: ComponentPacket[] = [];

    this._components.forEach((c, id) => {
      if (c.dirty) {
        dirties.push({
          componentType: ComponentType.AGENT,
          entityId: c.entityId
        });
        c.dirty = false;
      }
    });

    return dirties;
  }
}
