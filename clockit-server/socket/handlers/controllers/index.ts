import { ClientMessageHandlerKey, ClientMessage, HandlerDeps } from "../../../types";
import { handleSessionAttach } from "./session-attach.handler";
import { handleSessionDetach } from "./session-detach.handler";
import { handleSessionPause } from "./session-pause.handler";
import { handleSessionRemove } from "./session-remove.handler";
import { handleSessionResume } from "./session-resume.handler";
import { handleSessionStart } from "./session-start.handler";
import { handleSessionStop } from "./session-stop.handler";

// Placeholder for websocket listeners (e.g., event handlers)
export type ListenerHandlers = {
    [key in ClientMessageHandlerKey]: (deps: HandlerDeps) => void;
}

export const handlerControllers: ListenerHandlers = {
    'session-attach': handleSessionAttach,
    'session-detach': handleSessionDetach,
    'session-pause': handleSessionPause,
    'session-remove': handleSessionRemove,
    'session-resume': handleSessionResume,
    'session-start': handleSessionStart,
    'session-stop': handleSessionStop,
};