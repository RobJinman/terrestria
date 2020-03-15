import { EntityManager } from "./common/entity_manager";
import { ClientSystem } from "./common/client_system";
import { ComponentPacket, EntityId, Component } from "./common/system";
import { EntityType } from "./common/game_objects";

// Start from a large offset so that IDs created on the client don't clash
// with existing IDs created on the server
let nextEntityId = 1000000;

export function getNextEntityId() {
  return nextEntityId++;
}

export class ClientEntityManager extends EntityManager {
  constructor() {
    super();
  }

  updateComponent(packet: ComponentPacket) {
    const sys = <ClientSystem>this.getSystem(packet.componentType);
    sys.updateComponent(packet);
  }

  addEntity(id: EntityId, type: EntityType, components: Component[]) {
    super.addEntity(id, type, null, components);
  }
}
