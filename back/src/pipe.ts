import WebSocket from "ws";

export class Pipe {
  private _sockets: Set<WebSocket>;

  constructor() {
    this._sockets = new Set<WebSocket>();
  }

  addSocket(socket: WebSocket) {
    this._sockets.add(socket);
  }

  removeSocket(socket: WebSocket) {
    return this._sockets.delete(socket);
  }

  send(data: any) {
    const json = JSON.stringify(data);
    this._sockets.forEach(socket => socket.send(json));
  }
}
