import WebSocket from "ws";
import { EntityId } from "./common/system";
import { GameError } from "./common/error";

export class Pipe {
  private _sockets: Map<EntityId, WebSocket>;

  constructor() {
    this._sockets = new Map<EntityId, WebSocket>();
  }

  addConnection(playerId: EntityId, socket: WebSocket) {
    this._sockets.set(playerId, socket);
  }

  removeConnection(playerId: EntityId) {
    return this._sockets.delete(playerId);
  }

  get numConnections() {
    return this._sockets.size;
  }

  hasConnection(id: EntityId): boolean {
    return this._sockets.has(id);
  }

  sendToAll(data: any) {
    const json = JSON.stringify(data);
    this._sockets.forEach(socket => socket.send(json));
  }

  send(playerId: EntityId, data: any) {
    const json = JSON.stringify(data);
    const socket = this._sockets.get(playerId);

    if (!socket) {
      throw new GameError(`No socket for player with id ${playerId}`);
    }

    socket.send(json);
  }
}
