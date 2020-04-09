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

  getConnection(playerId: EntityId): WebSocket {
    const socket = this._sockets.get(playerId);
    if (!socket) {
      throw new GameError(`No socket for player with id ${playerId}`);
    }
    return socket;
  }

  get connectionIds() {
    return Array.from(this._sockets.keys());
  }

  async sendToAll(data: any) {
    const json = JSON.stringify(data);

    const promises: Promise<void>[] = [];
    for (const [id, socket] of this._sockets) {
      promises.push(this._sendThroughSocket(socket, json));
    }

    await Promise.all(promises);
  }

  async send(playerId: EntityId, data: any) {
    const json = JSON.stringify(data);
    const socket = this._sockets.get(playerId);

    if (!socket) {
      throw new GameError(`No socket for player with id ${playerId}`);
    }

    await this._sendThroughSocket(socket, json);
  }

  private _sendThroughSocket(socket: WebSocket, data: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      socket.send(data, (err) => {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }
}
