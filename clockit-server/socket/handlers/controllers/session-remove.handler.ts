import type { HandlerDeps } from "../../../types";


export const handleSessionRemove = ({ userId, payload, sessionsByUser, broadcastDelta, persistState, updateRunning }: HandlerDeps) => {
  if (!payload.sessionId) {return;}
  const sessions = sessionsByUser.get(userId)!;
  sessions.delete(payload.sessionId);
  broadcastDelta(userId, {
    sessionId: payload.sessionId,
    userId,
    label: "",
    startedAt: 0,
    accumulatedMs: 0,
    running: false,
    endedAt: undefined,
    goals: [],
    removed: true,
  });
  persistState(userId);
  updateRunning(userId);
};
