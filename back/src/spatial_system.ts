import { EntityId } from "./common/system";
import { ServerSystem } from "./common/server_system";
import { CSpatial } from "./spatial_component";
import { Span2d } from "./common/span";
import { GridModeImpl } from "./grid_mode_impl";
import { FreeModeImpl } from "./free_mode_impl";
import { ComponentType } from "./common/component_types";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { Direction } from "./common/definitions";
import { SpatialPacket, SpatialMode } from "./common/spatial_packet";
import { EntityManager } from "./entity_manager";
import { Logger } from "./logger";

export class SpatialSystem implements ServerSystem {
  private _components: Map<EntityId, CSpatial>;
  private _w = 0;
  private _h = 0;
  private _gridModeImpl: GridModeImpl;
  private _freeModeImpl: FreeModeImpl;

  constructor(em: EntityManager,
              w: number,
              h: number,
              gravityRegion: Span2d,
              logger: Logger) {

    const attemptTransitionFn = this._attemptModeTransition.bind(this);

    this._components = new Map<EntityId, CSpatial>();
    this._gridModeImpl = new GridModeImpl(em,
                                          w,
                                          h,
                                          gravityRegion,
                                          attemptTransitionFn,
                                          logger);
    this._freeModeImpl = new FreeModeImpl(em,
                                          gravityRegion,
                                          attemptTransitionFn);
    this._w = w;
    this._h = h;
  }

  getState() {
    const packets: SpatialPacket[] = [];

    this._components.forEach((c, id) => {
      if (!c.isLocalOnly) {
        packets.push({
          componentType: ComponentType.SPATIAL,
          entityId: c.entityId,
          mode: c.currentMode,
          x: c.x,
          y: c.y,
          // Ignore angle if fixed. Workaround for
          // https://github.com/liabru/matter-js/issues/800
          angle: c.freeMode.fixedAngle ? 0 : c.freeMode.angle,
          speed: 0
        });
      }
    });

    return packets;
  }

  addChildToEntity(id: EntityId, childId: EntityId) {
    const parent = this.getComponent(id);
    const child = this.getComponent(childId);

    parent.gridMode.addChild(child.gridMode);
    parent.freeMode.addChild(child.freeMode);
  }

  removeChildFromEntity(id: EntityId, childId: EntityId) {
    const parent = this.getComponent(id);

    parent.gridMode.removeChild(childId);
    parent.freeMode.removeChild(childId);
  }

  moveAgent(id: EntityId, direction: Direction): boolean {
    const c = this.getComponent(id);
    if (c.currentMode == SpatialMode.GRID_MODE) {
      return this._gridModeImpl.moveAgent(id, direction);
    }
    else {
      return this._freeModeImpl.moveAgent(id, direction);
    }
  }

  update() {
    this._gridModeImpl.update();
    this._freeModeImpl.update();
  }

  addComponent(component: CSpatial) {
    this._components.set(component.entityId, component);

    const x = component.x;
    const y = component.y;

    if (component.currentMode == SpatialMode.GRID_MODE) {
      this._gridModeImpl.addComponent(component.gridMode, x, y);
    }
    else if (component.currentMode == SpatialMode.FREE_MODE) {
      this._freeModeImpl.addComponent(component.freeMode, x, y);
    }
  }

  hasComponent(id: EntityId) {
    return this._components.has(id);
  }

  getComponent(id: EntityId) {
    const c = this._components.get(id);
    if (!c) {
      throw new GameError(`No spatial component for entity ${id}`);
    }
    return c;
  }

  removeComponent(id: EntityId) {
    const c = this._components.get(id);
    if (c) {
      this._gridModeImpl.removeComponent(c.gridMode);
      this._freeModeImpl.removeComponent(c.freeMode);
    }
    this._components.delete(id);
  }

  numComponents() {
    return this._components.size;
  }

  handleEvent(event: GameEvent) {}

  get width() {
    return this._w;
  }

  get height() {
    return this._h;
  }

  get grid() {
    return this._gridModeImpl.grid;
  }

  positionEntity(id: EntityId, x: number, y: number) {
    const c = this.getComponent(id);
    c.setStaticPos(x, y);
  }

  moveEntity(id: EntityId, dx: number, dy: number) {
    const c = this.getComponent(id);
    this.positionEntity(id, c.x + dx, c.y + dy);
  }

  getDirties() {
    const dirties: SpatialPacket[] = [];

    this._components.forEach((c, id) => {
      if (!c.isLocalOnly && c.isDirty()) {
        if (c.currentMode == SpatialMode.GRID_MODE) {
          dirties.push({
            entityId: c.entityId,
            componentType: ComponentType.SPATIAL,
            mode: c.currentMode,
            x: c.x,
            y: c.y,
            angle: 0,
            speed: c.gridMode.speed
          });
        }
        else if (c.currentMode == SpatialMode.FREE_MODE) {
          dirties.push({
            entityId: c.entityId,
            componentType: ComponentType.SPATIAL,
            mode: c.currentMode,
            x: c.x,
            y: c.y,
            // Ignore angle if fixed. Workaround for
            // https://github.com/liabru/matter-js/issues/800
            angle: c.freeMode.fixedAngle ? 0 : c.freeMode.angle,
            speed: 0
          });
        }
        c.setClean();
      }
    });

    return dirties;
  }

  gm_entityIsMoving(id: EntityId): boolean {
    const c = this.getComponent(id);
    return c.gridMode.moving();
  }

  private _doModeTransition(c: CSpatial,
                            x: number,
                            y: number,
                            direction?: Direction): boolean {
    const initMode = c.currentMode;

    if (c.currentMode == SpatialMode.GRID_MODE) {
      c.currentMode = SpatialMode.FREE_MODE;

      if (this._freeModeImpl.addComponent(c.freeMode, x, y, direction)) {
        this._gridModeImpl.removeComponent(c.gridMode);
        return true;
      }
    }
    else if (c.currentMode == SpatialMode.FREE_MODE) {
      c.currentMode = SpatialMode.GRID_MODE;

      if (this._gridModeImpl.addComponent(c.gridMode, x, y, direction)) {
        this._freeModeImpl.removeComponent(c.freeMode);
        return true;
      }
    }

    c.currentMode = initMode;
    return false;
  }

  private _attemptModeTransition(entityId: EntityId,
                                 destX: number,
                                 destY: number,
                                 direction?: Direction): boolean {
    const c = this.getComponent(entityId);
    return this._doModeTransition(c, destX, destY, direction);
  }
}
