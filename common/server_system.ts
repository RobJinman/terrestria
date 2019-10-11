import { System, ComponentPacket } from "./system";

export abstract class ServerSystem extends System {
  abstract getState(): ComponentPacket[];
  abstract getDirties(): ComponentPacket[];
}
