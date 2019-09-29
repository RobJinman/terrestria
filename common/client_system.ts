import { ComponentPacket, System } from "./system";

export abstract class ClientSystem extends System {
  abstract updateComponent(packet: ComponentPacket): void;
}
