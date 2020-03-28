import { Component, EntityId } from "./common/system";
import { ComponentType } from "./common/component_types";
import { EEntityMoved, GameEventType } from "./common/event";
import { EntityManager } from "./entity_manager";

export class CSpatial extends Component {
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

  get x_abs(): number {
    const parent = this._em.getEntityParent(this.entityId);
    if (parent) {
      const parentComp = <CSpatial>this._em.getComponent(ComponentType.SPATIAL,
                                                         parent);
      return parentComp.x_abs + this._posX;
    }
    else {
      return this._posX;
    }
  }

  get y_abs(): number {
    const parent = this._em.getEntityParent(this.entityId);
    if (parent) {
      const parentComp = <CSpatial>this._em.getComponent(ComponentType.SPATIAL,
                                                         parent);
      return parentComp.y_abs + this._posY;
    }
    else {
      return this._posY;
    }
  }

  get destX_abs(): number {
    const parent = this._em.getEntityParent(this.entityId);
    if (parent) {
      const parentComp = <CSpatial>this._em.getComponent(ComponentType.SPATIAL,
                                                         parent);
      return parentComp.destX_abs + this._destX;
    }
    else {
      return this._destX;
    }
  }

  get destY_abs(): number {
    const parent = this._em.getEntityParent(this.entityId);
    if (parent) {
      const parentComp = <CSpatial>this._em.getComponent(ComponentType.SPATIAL,
                                                         parent);
      return parentComp.destY_abs + this._destY;
    }
    else {
      return this._destY;
    }
  }

  get angle_abs(): number {
    const parent = this._em.getEntityParent(this.entityId);
    if (parent) {
      const parentComp = <CSpatial>this._em.getComponent(ComponentType.SPATIAL,
                                                         parent);
      return parentComp.angle_abs + this._angle;
    }
    else {
      return this._angle;
    }
  }
}
