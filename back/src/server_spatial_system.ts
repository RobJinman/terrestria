import { EntityId } from "./common/system";
import { ServerSystem } from "./common/server_system";
import { ServerSpatialComponent } from "./server_spatial_component";
import { Span2d } from "./common/span";
import { GridModeImpl } from "./grid_mode_impl";
import { FreeModeImpl } from "./free_mode_impl";
import { ComponentType } from "./common/component_types";
import { GameError } from "./common/error";
import { GameEvent, GameEventType, EEntityMoved } from "./common/event";
import { Direction } from "./common/definitions";
import { SpatialComponentPacket,
         SpatialMode } from "./common/spatial_component_packet";
import { ServerEntityManager } from "./server_entity_manager";
import { BLOCK_SZ } from "./common/constants";

export class ServerSpatialSystem implements ServerSystem {
  private _em: ServerEntityManager;
  private _components: Map<number, ServerSpatialComponent>;
  private _w = 0;
  private _h = 0;
  private _gravityRegion: Span2d;
  private _gridModeImpl: GridModeImpl;
  private _freeModeImpl: FreeModeImpl;

  constructor(em: ServerEntityManager,
              w: number,
              h: number,
              gravityRegion: Span2d) {
    this._em = em;
    this._components = new Map<number, ServerSpatialComponent>();
    this._gridModeImpl = new GridModeImpl(em, w, h);
    this._freeModeImpl = new FreeModeImpl(w, h, gravityRegion);
    this._w = w;
    this._h = h;
    this._gravityRegion = gravityRegion;
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

    if (component.currentMode == SpatialMode.GRID_MODE) {
      this._gridModeImpl.addComponent(component.gridMode);
    }
    else if (component.currentMode == SpatialMode.FREE_MODE) {
      this._freeModeImpl.addComponent(component.freeMode);
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

  handleEvent(event: GameEvent) {
    switch (event.type) {
      case GameEventType.ENTITY_MOVED: {
        const e = <EEntityMoved>event;
        this._onEntityMoved(e);
        break;
      }
    }
  }

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

  private _onEntityMoved(event: EEntityMoved) {
    const c = this.getComponent(event.entityId);
    const gridX = Math.floor(event.x / BLOCK_SZ);
    const gridY = Math.floor(event.y / BLOCK_SZ);

    if (this._gravityRegion.contains(gridX, gridY)) {
      if (c.currentMode != SpatialMode.FREE_MODE) {
        c.currentMode = SpatialMode.FREE_MODE;

        this._gridModeImpl.removeComponent(c.gridMode);
        this._freeModeImpl.addComponent(c.freeMode);

        c.freeMode.setStaticPos(c.gridMode.x(), c.gridMode.y());
      }
    }
    else {
      if (c.currentMode != SpatialMode.GRID_MODE) {
        c.currentMode = SpatialMode.GRID_MODE;

        this._freeModeImpl.removeComponent(c.freeMode);
        this._gridModeImpl.addComponent(c.gridMode);

        c.gridMode.setStaticPos(c.freeMode.x(), c.freeMode.y());
      }
    }
  }
}
