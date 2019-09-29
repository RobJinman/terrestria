import { EntityManager } from "./common/entity_manager";
import { ClientSystem } from "./common/client_system";
import { ComponentPacket } from "./common/system";

export class ClientEntityManager extends EntityManager {
  constructor() {
    super();
  }

  updateComponent(packet: ComponentPacket) {
    const sys = <ClientSystem>this.getSystem(packet.componentType);
    sys.updateComponent(packet);
  }
}
