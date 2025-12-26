import type { HandlerDeps } from "../../../types";
export const handleSessionResume = ({ userId, payload, sessionsByUser, broadcastDelta, persistState, updateRunning }: HandlerDeps) => {
  if (!payload.sessionId) {return;}
  const sessions = sessionsByUser.get(userId)!;
  const existing = sessions.get(payload.sessionId);
  if (existing) {
    sessions.set(payload.sessionId, { ...existing, running: true, startedAt: Date.now(), endedAt: undefined, pausedAt: undefined });
    broadcastDelta(userId, sessions.get(payload.sessionId)!);
    persistState(userId);
    updateRunning(userId);
  }
};
