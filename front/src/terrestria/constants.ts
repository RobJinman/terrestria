import { BLOCK_SZ_WLD } from "./common/constants";

export const BLOCK_SZ_PX = 24;
export const WORLD_UNIT = BLOCK_SZ_PX / BLOCK_SZ_WLD;
export const PIXEL_SZ = BLOCK_SZ_WLD / BLOCK_SZ_PX;

export const SKY_Z_INDEX = 0;
export const PLAYER_Z_INDEX = 10;
export const PLAYER_BUCKET_VALUE_Z_INDEX = 50;
export const UI_Z_INDEX = 100;
