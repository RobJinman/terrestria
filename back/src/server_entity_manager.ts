import { EntityManager } from "./common/entity_manager";
import { ComponentType } from "./common/component_types";
import { ServerSystem } from "./common/server_system";
import { ComponentPacket } from "./common/system";

export class ServerEntityManager extends EntityManager {
  constructor() {
    super();
  }

  getDirties(): ComponentPacket[] {
    let dirties: ComponentPacket[] = [];
    this._systems().forEach(sys => dirties.push(...sys.getDirties()));

    return dirties;
  }

  getState(): ComponentPacket[] {
    let packets: ComponentPacket[] = [];
    this._systems().forEach(sys => packets.push(...sys.getState()));

    return packets;
  }

  private _systems() {
    return <Map<ComponentType, ServerSystem>>this.systems;
  }
}
