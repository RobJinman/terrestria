import { EntityManager } from "./common/entity_manager";
import { ClientSystem } from "./common/client_system";
import { ComponentPacket } from "./common/system";
import { ComponentType } from "./common/component_types";

export class ClientEntityManager extends EntityManager {
  constructor() {
    super();
  }

  updateComponent(packet: ComponentPacket) {
    const sys = <ClientSystem>this.getSystem(packet.componentType);
    sys.updateComponent(packet);
  }

  private _systems() {
    return <Map<ComponentType, ClientSystem>>this.systems;
  }
}
