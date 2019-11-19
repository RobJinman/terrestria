import { EEntityMoved, GameEventType } from "./common/event";
import { EntityId } from "./common/system";
import { EntityManager } from "./common/entity_manager";
import { Grid } from "./grid";
import { SpatialSubcomponent } from "./spatial_subcomponent";
import { GridModeProperties } from "./grid_mode_properties";

export class GridModeSubcomponent implements SpatialSubcomponent {
  dirty = true;
  falling = false;

  private _entityId: EntityId;
  private _speed: number = 0; // Pixels per second
  private _posX: number = 0;
  private _posY: number = 0;
  private _destX: number = 0;
  private _destY: number = 0;
  private _em: EntityManager;
  private _grid: Grid;
  private _properties: GridModeProperties;

  constructor(entityId: EntityId,
              entityManager: EntityManager,
              grid: Grid,
              properties: GridModeProperties) {
    this._entityId = entityId;
    this._em = entityManager;
    this._grid = grid;
    this._properties = properties;
  }

  moving() {
    return this._speed > 0.1;
  }

  get entityId() {
    return this._entityId;
  }

  get speed() {
    return this._speed;
  }

  set speed(value: number) {
    if (value != this._speed) {
      this._speed = value;
      this.dirty = true;
    }
  }

  setInstantaneousPos(x: number, y: number) {
    this._posX = x;
    this._posY = y;

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entities: [this.entityId],
      entityId: this.entityId,
      x,
      y
    };

    this._em.postEvent(event);
  }

  setStaticPos(x: number, y: number) {
    this.setInstantaneousPos(x, y);
    this.setDestination(x, y, 0);
  }

  setDestination(x: number, y: number, speed: number) {
    const oldDestX = this._destX;
    const oldDestY = this._destY;

    this._destX = x;
    this._destY = y;
    this.speed = speed;

    if (oldDestX != x || oldDestY != y) {
      this.dirty = true;
      this._grid.onItemMoved(this,
                             oldDestX,
                             oldDestY,
                             this._destX,
                             this._destY);
    }
  }

  x() {
    return this._posX;
  }

  y() {
    return this._posY;
  }

  get destX() {
    return this._destX;
  }

  get destY() {
    return this._destY;
  }

  get solid() {
    return this._properties.solid;
  }

  get blocking() {
    return this._properties.blocking;
  }

  get stackable() {
    return this._properties.stackable;
  }

  get heavy() {
    return this._properties.heavy;
  }

  get movable() {
    return this._properties.movable;
  }

  get isAgent() {
    return this._properties.isAgent;
  }
}