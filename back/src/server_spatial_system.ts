import { EntityId } from "./common/system";
import { ServerSystem } from "./common/server_system";
import { ServerSpatialComponent } from "./server_spatial_component";
import { Span2d } from "./common/span";
import { GridModeImpl } from "./grid_mode_impl";
import { FreeModeImpl } from "./free_mode_impl";
import { ComponentType } from "./common/component_types";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { Direction } from "./common/definitions";
import { SpatialComponentPacket,
         SpatialMode } from "./common/spatial_component_packet";
import { ServerEntityManager } from "./server_entity_manager";
import { EntityManager } from "./common/entity_manager";
import { directionToVector } from "./common/geometry";

export class ServerSpatialSystem implements ServerSystem {
  private _em: EntityManager;
  private _components: Map<number, ServerSpatialComponent>;
  private _w = 0;
  private _h = 0;
  private _gridModeImpl: GridModeImpl;
  private _freeModeImpl: FreeModeImpl;

  constructor(em: ServerEntityManager,
              w: number,
              h: number,
              gravityRegion: Span2d) {

    const attemptTransitionToGridModeFn =
      this._attemptModeTransition.bind(this, SpatialMode.FREE_MODE);

    const attemptTransitionToFreeModeFn =
      this._attemptModeTransition.bind(this, SpatialMode.GRID_MODE);

    this._em = em;
    this._components = new Map<number, ServerSpatialComponent>();
    this._gridModeImpl = new GridModeImpl(em,
                                          w,
                                          h,
                                          gravityRegion,
                                          attemptTransitionToFreeModeFn);
    this._freeModeImpl = new FreeModeImpl(gravityRegion,
                                          attemptTransitionToGridModeFn);
    this._w = w;
    this._h = h;
  }

  getState() {
    const packets: SpatialComponentPacket[] = [];

    this._components.forEach((c, id) => {
      packets.push({
        componentType: ComponentType.SPATIAL,
        entityId: c.entityId,
        mode: c.currentMode,
        x: c.x,
        y: c.y,
        // Ignore angle if fixed. Workaround for
        // https://github.com/liabru/matter-js/issues/800
        angle: c.freeMode.fixedAngle ? 0 : c.freeMode.angle,
        speed: c.gridMode.speed
      });
    });

    return packets;
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

  addComponent(component: ServerSpatialComponent) {
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
    const dirties: SpatialComponentPacket[] = [];

    this._components.forEach((c, id) => {
      if (c.isDirty()) {
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

  gridMode(entityId: EntityId): boolean {
    const c = this.getComponent(entityId);
    return c.currentMode == SpatialMode.GRID_MODE;
  }

  freeMode(entityId: EntityId): boolean {
    const c = this.getComponent(entityId);
    return c.currentMode == SpatialMode.FREE_MODE;
  }

  gm_entityIsMoving(id: EntityId): boolean {
    const c = this.getComponent(id);
    return c.gridMode.moving();
  }

  private _doModeTransition(c: ServerSpatialComponent,
                            x: number,
                            y: number,
                            direction: Direction): boolean {
    if (c.currentMode == SpatialMode.GRID_MODE) {
      if (this._freeModeImpl.addComponent(c.freeMode, x, y, direction)) {
        this._gridModeImpl.removeComponent(c.gridMode);
        c.currentMode = SpatialMode.FREE_MODE;
        return true;
      }
    }
    else if (c.currentMode == SpatialMode.FREE_MODE) {
      if (this._gridModeImpl.addComponent(c.gridMode, x, y, direction)) {
        this._freeModeImpl.removeComponent(c.freeMode);
        c.currentMode = SpatialMode.GRID_MODE;
        return true;
      }
    }

    return false;
  }

  private _attemptModeTransition(currentMode: SpatialMode,
                                 entityId: EntityId,
                                 direction: Direction): boolean {
    const c = this.getComponent(entityId);

    if (currentMode != c.currentMode) {
      // A transition must be underway already. Prevent re-entering this
      // function recursively.
      return false;
    }

    const v = directionToVector(direction);
    const destX = c.x + v.x;
    const destY = c.y + v.y;

    if (c.currentMode == SpatialMode.GRID_MODE) {
      return this._doModeTransition(c, destX, destY, direction);
    }
    else if (c.currentMode == SpatialMode.FREE_MODE) {
      return this._doModeTransition(c, destX, destY, direction);
    }

    return false;
  }
}
