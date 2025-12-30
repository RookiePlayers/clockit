import { WebsocketOrchestrator } from "../../orchestrator/websocket.orchestrator";

export const emitError = (userId: string, code: string, message: string) => {
  WebsocketOrchestrator.getInstance().broadcast(userId, {
    type: "error",
    payload: { code, message },
  });
};
