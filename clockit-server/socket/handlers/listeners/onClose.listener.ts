import * as WebSocket from "ws";
import { WebsocketOrchestrator } from "../../orchestrator/websocket.orchestrator";
import { IWSListener } from "../../../types";
import { ListenerKeys } from "./listeners";


export const onCloseListener:IWSListener = {
    listen(socket: WebSocket, raw: WebSocket.RawData, userId: string) {
    socket.on(ListenerKeys.close, (raw) => {
        try {
            WebsocketOrchestrator.getInstance().close(userId);
        } catch (error) {
            console.error("[clockit-server] Failed to close connection", error);
        }
    });
}
};