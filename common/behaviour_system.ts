import { Component, ComponentPacket, EntityId } from "./system";
import { GameError } from "./error";
import { GameEvent, GameEventType } from "./event";
import { ComponentType } from "./component_types";
import { ServerSystem } from "./server_system";
import { ClientSystem } from "./client_system";

export type EventHandlerFn = (event: GameEvent) => void;
export type EventHandlerMap = Map<GameEventType, EventHandlerFn>;

function newEventHandlerMap() {
  return new Map<GameEventType, EventHandlerFn>();
}

export class BehaviourComponent extends Component {
  private _targetedHandlers: EventHandlerMap;
  private _broadcastHandlers: EventHandlerMap;

  constructor(entityId: EntityId,
              targetedHandlers: EventHandlerMap = newEventHandlerMap(),
              broadcastHandlers: EventHandlerMap = newEventHandlerMap()) {
    super(entityId, ComponentType.BEHAVIOUR);

    this._targetedHandlers = targetedHandlers;
    this._broadcastHandlers = broadcastHandlers;
  }

  handleBroadcastEvent(event: GameEvent) {
    const handler = this._broadcastHandlers.get(event.type);
    if (!handler) {
      throw new Error("Component doesn't handle this event type");
    }
    handler(event);
  }

  handleTargetedEvent(event: GameEvent) {
    const handler = this._targetedHandlers.get(event.type);
    if (!handler) {
      throw new Error("Component doesn't handle this event type");
    }
    handler(event);
  }

  get targetedEvents(): Set<GameEventType> {
    return new Set(this._targetedHandlers.keys());
  }

  get broadcastEvents(): Set<GameEventType> {
    return new Set(this._broadcastHandlers.keys());
  }
}

function addToMapOfSets<K, V>(m: Map<K, Set<V>>, key: K, value: V) {
  let set = m.get(key);
  if (!set) {
    set = new Set<V>();
    m.set(key, set);
  }
  set.add(value);
}

export class BehaviourSystem implements ServerSystem, ClientSystem {
  private _components: Map<number, BehaviourComponent>;
  private _targetedEvents: Map<GameEventType, Set<EntityId>>;
  private _broadcastEvents: Map<GameEventType, Set<EntityId>>;

  constructor() {
    this._components = new Map<number, BehaviourComponent>();
    this._targetedEvents = new Map<GameEventType, Set<EntityId>>();
    this._broadcastEvents = new Map<GameEventType, Set<EntityId>>();
  }

  updateComponent(packet: ComponentPacket) {}

  numComponents() {
    return this._components.size;
  }

  addComponent(component: BehaviourComponent) {
    this._components.set(component.entityId, component);

    component.targetedEvents.forEach(type => {
      addToMapOfSets(this._targetedEvents, type, component.entityId);
    });

    component.broadcastEvents.forEach(type => {
      addToMapOfSets(this._broadcastEvents, type, component.entityId);
    });
  }

  hasComponent(id: EntityId) {
    return this._components.has(id);
  }

  getComponent(id: EntityId) {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No behaviour component for entity ${id}`);
    }
    return c;
  }

  removeComponent(id: EntityId) {
    const c = this._components.get(id);

    if (c) {
      this._targetedEvents.forEach(entities => entities.delete(c.entityId));
      this._broadcastEvents.forEach(entities => entities.delete(c.entityId));
    }

    this._components.delete(id);
  }

  handleEvent(event: GameEvent) {
    const broadcastHandlers = this._broadcastEvents.get(event.type);
    if (broadcastHandlers) {
      broadcastHandlers.forEach(id => {
        const c = this.getComponent(id);
        c.handleBroadcastEvent(event);
      })
    }
    const targetedHandlers = this._targetedEvents.get(event.type);
    if (targetedHandlers) {
      event.entities.forEach(id => {
        if (targetedHandlers.has(id)) {
          const c = this.getComponent(id);
          c.handleTargetedEvent(event);
        }
      });
    }
  }

  update() {}

  getState() {
    return [];
  }

  getDirties() {
    return [];
  }
}
