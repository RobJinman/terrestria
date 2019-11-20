import { EntityId } from "./common/system";
import { ServerSystem } from "./common/server_system";
import { ServerSpatialComponent,
         SpatialMode } from "./server_spatial_component";
import { Span2d } from "./common/geometry";
import { GridModeImpl } from "./grid_mode_impl";
import { FreeModeImpl } from "./free_mode_impl";
import { ComponentType } from "./common/component_types";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { Direction } from "./common/definitions";
import { SpatialComponentPacket } from "./common/spatial_component_packet";
import { ServerEntityManager } from "./server_entity_manager";

export class ServerSpatialSystem implements ServerSystem {
  protected em: ServerEntityManager;
  protected components: Map<number, ServerSpatialComponent>;
  protected w = 0;
  protected h = 0;
  protected gravityRegion: Span2d;
  protected frameRate: number;
  protected gridModeImpl: GridModeImpl;
  protected freeModeImpl: FreeModeImpl;

  constructor(em: ServerEntityManager,
              w: number,
              h: number,
              gravityRegion: Span2d,
              frameRate: number) {
    this.em = em;
    this.components = new Map<number, ServerSpatialComponent>();
    this.gridModeImpl = new GridModeImpl(em, w, h);
    this.freeModeImpl = new FreeModeImpl();
    this.w = w;
    this.h = h;
    this.gravityRegion = gravityRegion;
    this.frameRate = frameRate;

    this.gridModeImpl.setComponentsMap(this.components);
    this.freeModeImpl.setComponentsMap(this.components);
  }

  getState() {
    const packets: SpatialComponentPacket[] = [];

    this.components.forEach((c, id) => {
      packets.push({
        componentType: ComponentType.SPATIAL,
        entityId: c.entityId,
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
      return this.gridModeImpl.moveAgent(id, direction);
    }
    else {
      return this.freeModeImpl.moveAgent(id, direction);
    }
  }

  update() {
    this.gridModeImpl.update();
    this.freeModeImpl.update();
  }

  addComponent(component: ServerSpatialComponent) {
    this.components.set(component.entityId, component);
    this.gridModeImpl.onComponentAdded(component);
    this.freeModeImpl.onComponentAdded(component);
  }

  hasComponent(id: EntityId) {
    return this.components.has(id);
  }

  getComponent(id: EntityId) {
    const c = this.components.get(id);
    if (!c) {
      throw new GameError(`No spatial component for entity ${id}`);
    }
    return c;
  }

  removeComponent(id: EntityId) {
    const c = this.components.get(id);
    if (c) {
      this.gridModeImpl.onComponentRemoved(c);
      this.freeModeImpl.onComponentRemoved(c);
    }
    this.components.delete(id);
  }

  numComponents() {
    return this.components.size;
  }

  handleEvent(event: GameEvent) {}

  get width() {
    return this.w;
  }

  get height() {
    return this.h;
  }

  get grid() {
    return this.gridModeImpl.grid;
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

    this.components.forEach((c, id) => {
      if (c.isDirty()) {
        dirties.push({
          entityId: c.entityId,
          componentType: ComponentType.SPATIAL,
          x: c.x,
          y: c.y,
          speed: c.gridMode.speed
        });
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
}