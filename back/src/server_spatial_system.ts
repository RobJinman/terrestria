import { ComponentType } from "./common/component_types";
import { ServerEntityManager } from "./server_entity_manager";
import { Span2d } from "./common/geometry";
import { GridModeImpl } from "./grid_mode_impl";
import { EntityId, ComponentPacket } from "./common/system";
import { EntityManager } from "./common/entity_manager";
import { GameError } from "./common/error";
import { GameEvent } from "./common/event";
import { FreeModeImpl } from "./free_mode_impl";
import { ServerSpatialComponent,
         SpatialMode } from "./server_spatial_component";
import { Direction } from "./common/definitions";

export interface SpatialComponentPacket extends ComponentPacket {
  x: number;
  y: number;
  destX: number;
  destY: number;
  speed: number;
}

export class ServerSpatialSystem {
  protected em: EntityManager;
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
    this.gridModeImpl = new GridModeImpl(em, w, h, frameRate);
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
        destX: c.gridMode.destX,
        destY: c.gridMode.destY,
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
          speed: c.gridMode.speed,
          destX: c.gridMode.destX,
          destY: c.gridMode.destY
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