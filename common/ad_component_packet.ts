import { ComponentPacket } from "./system";

export interface AdComponentPacket extends ComponentPacket {
  adName: string|null;
  adUrl: string|null;
}
