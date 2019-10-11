import { EntityManager } from "./common/entity_manager";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { ComponentPacket, EntityId } from "./common/system";
import { Pipe } from "./pipe";
import { GameEvent } from "./common/event";
import { REvent, GameResponseType, REntitiesDeleted } from "./common/response";

export class ServerEntityManager extends EntityManager {
  private _pipe: Pipe;
  private _eventsPendingTransmission: GameEvent[] = [];

  constructor(pipe: Pipe) {
    super();

    this._pipe = pipe;
  }

  submitEvent(event: GameEvent) {
    super.postEvent(event);
    this._eventsPendingTransmission.push(event);
  }

  transmitEvents() {
    this._eventsPendingTransmission.forEach(e => {
      const response: REvent = {
        type: GameResponseType.EVENT,
        event: e
      };
      this._pipe.sendToAll(response);
    });
  }

  removeEntity(id: EntityId) {
    const e = this.entities.get(id);
    if (e) {
      super.removeEntity(id);

      const response: REntitiesDeleted = {
        type: GameResponseType.ENTITIES_DELETED,
        entities: [{
          id,
          type: e.type
        }]
      };

      this._pipe.sendToAll(response);
    }
  }

  getState(): ComponentPacket[] {
    let packets: ComponentPacket[] = [];
    this._systems().forEach(sys => packets.push(...sys.getState()));

    return packets;
  }

  getDirties(): ComponentPacket[] {
    let dirties: ComponentPacket[] = [];
    this._systems().forEach(sys => dirties.push(...sys.getDirties()));

    return dirties;
  }

  private _systems() {
    return <Map<ComponentType, ServerSystem>>this.systems;
  }
}
