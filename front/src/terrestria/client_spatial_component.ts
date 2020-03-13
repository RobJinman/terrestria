import { Component, EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { EEntityMoved, GameEventType } from "./common/event";
import { EntityManager } from "./common/entity_manager";

export class ClientSpatialComponent extends Component {
  private _em: EntityManager;
  private _posX = 0;
  private _posY = 0;
  private _destX = 0;
  private _destY = 0;
  private _angle = 0;
  speed = 0;

  constructor(entityId: EntityId, em: EntityManager) {
    super(entityId, ComponentType.SPATIAL);
    this._em = em;
  }

  setInstantaneousPos(x: number, y: number) {
    this._posX = x;
    this._posY = y;

    const event: EEntityMoved = {
      type: GameEventType.ENTITY_MOVED,
      entities: [this.entityId],
      entityId: this.entityId,
      x: this.x,
      y: this.y
    };

    this._em.postEvent(event);
  }

  setStaticPos(x: number, y: number) {
    this.speed = 0;
    this._destX = x;
    this._destY = y;
    this.setInstantaneousPos(x, y);
  }

  setDestination(x: number, y: number, speed: number) {
    this._destX = x;
    this._destY = y;
    this.speed = speed;
  }

  setAngle(angle: number) {
    this._angle = angle;
    
    // TODO: EEntityMoved?
  }

  moving() {
    return this.speed > 0.1;
  }

  get x() {
    return this._posX;
  }

  get y() {
    return this._posY;
  }

  get destX() {
    return this._destX;
  }

  get destY() {
    return this._destY;
  }

  get angle() {
    return this._angle;
  }
}
