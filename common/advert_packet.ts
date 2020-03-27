import { ComponentPacket } from "./system";

export interface AdvertPacket extends ComponentPacket {
  adName: string|null;
  adUrl: string|null;
}
