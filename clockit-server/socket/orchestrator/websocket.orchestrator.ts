import type { Server } from "http";
import type http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { WS_PATH } from "../../config/websocket.config";
import { ClientMessage, SessionState } from "../../types";
import { handlerControllers } from "../handlers/controllers";
import { Cachier } from "../../caching";
import { emitError } from "../handlers/emitters/error.emitter";
import { randomUUID } from "crypto";
export type ConnectionHandler = (socket: WebSocket, req: http.IncomingMessage) => void;
type HandlerSetupParams = {
  id: string;
  data: ClientMessage;
};
export class WebsocketOrchestrator {
  private static instance: WebsocketOrchestrator;
  private wss: WebSocketServer;
  private runningUsers: Set<string> = new Set();

  private constructor(server: Server, private sessionsByUser: Map<string, Map<string, any>>, private socketsByUser: Map<string, Set<WebSocket>> = new Map()) {
    this.wss = new WebSocketServer({ server, path: WS_PATH });
  }

  static getInstance(server?: Server, sessionsByUser?: Map<string, Map<string, any>>): WebsocketOrchestrator {
    if (!WebsocketOrchestrator.instance) {
      if (server === undefined) {
        throw new Error("WebsocketOrchestrator not initialized. Server instance required.");
      }
      WebsocketOrchestrator.instance = new WebsocketOrchestrator(server, sessionsByUser ?? new Map());
    }
    return WebsocketOrchestrator.instance;
  }

  getSessionsByUser() {
    return this.sessionsByUser;
  }

  getSocketsByUser() {
    return this.socketsByUser;
  }

  getRunningUsers() {
    return this.runningUsers;
  }


  start(onConnection: ConnectionHandler) {
    this.wss.on("connection", onConnection);
  }

  ensureUserMaps(userId: string) {
    if (!this.sessionsByUser.has(userId)) {
      this.sessionsByUser.set(userId, new Map());
    }
    if (!this.socketsByUser.has(userId)) {
      this.socketsByUser.set(userId, new Set());
    }
  }

  updateRunningUsers(userId: string) {
    const sessions = this.sessionsByUser.get(userId);
    if (!sessions) {
      this.runningUsers.delete(userId);
      return;
    }
    const hasRunning = Array.from(sessions.values()).some((s) => s.running);
    if (hasRunning) {
      this.runningUsers.add(userId);
    } else {
      this.runningUsers.delete(userId);
    }
  }

  handleMessage(params: HandlerSetupParams) {
    const { id, data } = params;
    console.info("[ws] inbound message", { userId: id, type: data.type });
    this.ensureUserMaps(id);
    const handler = handlerControllers[data.type];
    if (handler) {
      try {
        handler({ userId: id, 
          payload: data.payload, 
          sessionsByUser: this.sessionsByUser, 
          broadcastDelta: this.broadcastDelta.bind(this), 
          persistState:(user) => Cachier.getInstance().getCache().saveUserSessions(user, this.sessionsByUser.get(user) || new Map()),
          updateRunning: this.updateRunningUsers.bind(this),
          randomUUID: () => randomUUID(),
        });
      } catch (err) {
        emitError(id, "handler_error", err instanceof Error ? err.message : "Unknown handler error");
        console.error("[ws] handler error", { userId: id, type: data.type, error: err });
      }
    }
  }

  close(userId: string) {
    const sockets = this.socketsByUser.get(userId);
    if (sockets) {
      sockets.forEach((socket) => {
        socket.close();
      });
      this.socketsByUser.delete(userId);
    }
  }

  broadcast(userId: string, data: unknown) {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets?.size) { return; }
    const payload = JSON.stringify(data);
    sockets.forEach((socket) => {
      if (socket.readyState !== WebSocket.OPEN) {
        sockets.delete(socket);
        return;
      }
      socket.send(payload, (err) => {
        if (err) {
          console.warn("[ws] broadcast failed, pruning socket", { userId, error: err instanceof Error ? err.message : err });
          socket.close();
          sockets.delete(socket);
        }
      });
    });
  }

  broadcastDelta(
    userId: string,
    session: SessionState | { sessionId: string; removed: true },
    options?: { omitGoals?: boolean; fields?: Array<keyof SessionState> },
  ) {
    let payload: any = session;
    if ("removed" in session) {
      payload = session;
    } else if (options?.fields?.length) {
      payload = options.fields.reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = session[key];
        return acc;
      }, { sessionId: session.sessionId });
    } else if (options?.omitGoals) {
      const { goals, ...rest } = session;
      payload = { ...rest };
    }
    console.info("[ws] broadcastDelta", { userId, sessionId: "sessionId" in payload ? (payload as any).sessionId : undefined, removed: "removed" in payload, fields: options?.fields, omitGoals: options?.omitGoals });
    this.broadcast(userId, { type: "session-update", payload });
  };
}
