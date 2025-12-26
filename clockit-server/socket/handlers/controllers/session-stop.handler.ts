import type { HandlerDeps } from "../../../types";

export const handleSessionStop = ({ userId, payload, sessionsByUser, broadcastDelta, persistState, updateRunning }: HandlerDeps) => {
  if (!payload.sessionId) {return;}
  const sessions = sessionsByUser.get(userId)!;
  const existing = sessions.get(payload.sessionId);
  if (existing) {
    const now = Date.now();
    const accumulated = existing.accumulatedMs + (existing.running ? now - existing.startedAt : 0);
    sessions.set(payload.sessionId, { ...existing, running: false, accumulatedMs: accumulated, endedAt: now, pausedAt: undefined });
    broadcastDelta(userId, sessions.get(payload.sessionId)!);
    persistState(userId);
    updateRunning(userId);
  }
};
