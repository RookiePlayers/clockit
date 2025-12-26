import * as ws from "ws";

export type Goal = {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  groupId: string;
  groupName: string;
  estimatedGoalTime?: number;
};

export type SessionState = {
  sessionId: string;
  userId: string;
  label: string;
  startedAt: number;
  accumulatedMs: number;
  running: boolean;
  endedAt?: number;
  pausedAt?: number;
  goals: Goal[];
  groupId?: string;
  groupName?: string;
  comment?: string;
  removed?: boolean
};
export type ClientMessageHandlerKey = 'session-start' | 'session-stop' | 'session-resume' | 'session-pause' | 'session-remove' | 'session-attach' | 'session-detach';
export type ClientMessage =
  | { type: "session-start"; payload: Pick<SessionState, "label" | "goals" | "groupId" | "groupName" | "comment"> & { sessionId?: string } }
  | { type: "session-stop"; payload: { sessionId: string } }
  | { type: "session-resume"; payload: { sessionId: string } }
  | { type: "session-pause"; payload: { sessionId: string } }
  | { type: "session-remove"; payload: { sessionId: string } }
  | { type: "session-attach"; payload: { sessionId: string; goal: Goal } }
  | { type: "session-detach"; payload: { sessionId: string; goalId: string } };

export type HandlerDepsPayload = {
  sessionId?: string;
  goalId?: string,
  goal?: Goal,
  label?: string,
  goals?: Goal[],
  groupId?: string,
  groupName?: string,
  comment?: string
}

export type HandlerDeps = {
  userId: string;
  payload: HandlerDepsPayload;
  sessionsByUser: Map<string, Map<string, SessionState>>;
  broadcastDelta: (userId: string, session: SessionState | { sessionId: string; removed: true }, options?: { omitGoals?: boolean; fields?: Array<keyof SessionState> }) => void;
  persistState: (userId: string) => void;
  updateRunning: (userId: string) => void;
  randomUUID?: () => string;
};

export interface IWSListener {
  listen(socket: ws.WebSocket, raw: ws.RawData, userId: string): void;
}
