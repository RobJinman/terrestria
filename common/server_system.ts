import { System, ComponentPacket } from "./system";

export abstract class ServerSystem extends System {
  abstract getDirties(): ComponentPacket[];
  abstract getState(): ComponentPacket[];
}
