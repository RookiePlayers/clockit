import type http from "http";
import type { WebSocket } from "ws";
import type { ConnectionHandler, WebsocketOrchestrator } from "../../orchestrator/websocket.orchestrator";

export const registerConnectionListener = (orchestrator: WebsocketOrchestrator, handler: ConnectionHandler) => {
  orchestrator.start((socket: WebSocket, req: http.IncomingMessage) => handler(socket, req));
};
