import { ComponentPacket } from "./system";

export interface InventoryPacket extends ComponentPacket {
  buckets: {
    name: string;
    value: number;
  }[];
}
