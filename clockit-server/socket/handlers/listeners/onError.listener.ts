import * as WebSocket from "ws";
import { WebsocketOrchestrator } from "../../orchestrator/websocket.orchestrator";
import { IWSListener } from "../../../types";
import { ListenerKeys } from "./listeners";


export const onErrorListener:IWSListener = {
    listen(socket: WebSocket, raw: WebSocket.RawData, userId: string) {
    socket.on(ListenerKeys.error, (raw) => {
        try {
            console.log(`[clockit-server] error from user ${userId}:`, raw);
        } catch (error) {
            console.error("[clockit-server] Failed to close connection", error);
        }
    });
}
};