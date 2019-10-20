import { GameError } from "./common/error";

export interface AppConfig {
  pinataApiBase: string,
  productKey: string
}

export function makeAppConfig(): AppConfig {
  if (!process.env.PINATA_API_BASE) {
    throw new GameError("PINATA_URL not set");
  }

  if (!process.env.PRODUCT_KEY) {
    throw new GameError("PRODUCT_KEY not set");
  }

  return {
    pinataApiBase: process.env.PINATA_API_BASE,
    productKey: process.env.PRODUCT_KEY
  };
}
