import * as WebSocket from "ws";
import { clientMessageSchema } from "../../../validation/schema.zod";
import { WebsocketOrchestrator } from "../../orchestrator/websocket.orchestrator";
import { ClientMessage, IWSListener } from "../../../types";
import { ListenerKeys } from "./listeners";


export const onMessageListener:IWSListener = {
    listen(socket: WebSocket, raw: WebSocket.RawData, userId: string) {
    socket.on(ListenerKeys.message, (raw) => {
        try {
            const parsed = clientMessageSchema.safeParse(JSON.parse(raw.toString()));
            if (!parsed.success) { return; }
            WebsocketOrchestrator.getInstance().handleMessage({
                id: userId,
                data: parsed.data as ClientMessage
            });
        } catch (error) {
            console.error("[clockit-server] Failed to parse message", error);
        }
    });
}
};