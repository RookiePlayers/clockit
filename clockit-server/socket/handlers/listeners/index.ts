import { ListenerKeys } from "./listeners";
import { IWSListener } from "../../../types";
import { onMessageListener } from "./onMessage.listener";
import { onCloseListener } from "./onClose.listener";
import { onErrorListener } from "./onError.listener";
import * as ws from "ws";

export const listeners: {
    [key in ListenerKeys]: IWSListener;
} = {
    [ListenerKeys.message]: onMessageListener,
    [ListenerKeys.close]: onCloseListener,
    [ListenerKeys.error]: onErrorListener,
};

export const startListenersForSocket = (socket: ws.WebSocket, raw: ws.RawData, userId: string) => {
    Object.values(listeners).forEach((listener) => {
        listener.listen(socket, raw, userId);
    });
};