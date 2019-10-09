import { System, ComponentPacket, EntityId } from "./system";

export abstract class ServerSystem extends System {
  abstract getState(): ComponentPacket[];
  abstract getComponentState(entityId: EntityId): ComponentPacket|null;
}
