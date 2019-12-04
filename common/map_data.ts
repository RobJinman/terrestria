import { EntityType } from "./game_objects";
import { Vec2 } from "./geometry";

export type SpanDesc = {
  a: number;
  b: number;
};

export type Span2dDesc = SpanDesc[][];

export type EntityDesc = {
  type: EntityType;
  data: any;
};

export interface MapData {
  width: number;
  height: number;
  gravityRegion: Span2dDesc;
  spawnPoint: Vec2;
  entities: EntityDesc[];
}
