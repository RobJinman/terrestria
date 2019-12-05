import { EntityManager } from "./common/entity_manager";
import { ClientSystem } from "./common/client_system";
import { ComponentPacket, EntityId, Component } from "./common/system";
import { EntityType } from "./common/game_objects";

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
