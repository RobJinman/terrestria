import { EntityManager, getNextEntityId } from "../entity_manager";
import { EntityId } from "../common/system";

export function constructRespawnArea(em: EntityManager, desc: any): EntityId {
  const id = getNextEntityId();

  // TODO

  return id;
}
