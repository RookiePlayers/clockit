import type { HandlerDeps } from "../../../types";

export const handleSessionAttach = ({ userId, payload, sessionsByUser, broadcastDelta, persistState, updateRunning }: HandlerDeps) => {
  if (!payload.sessionId || !payload.goal?.id) {return;}
  const sessions = sessionsByUser.get(userId)!;
  const existing = sessions.get(payload.sessionId);
  if (existing) {
    const goals = existing.goals.some((g) => g.id === payload.goal?.id) ? existing.goals : [...existing.goals, payload.goal];
    sessions.set(payload.sessionId, { ...existing, goals });
    broadcastDelta(userId, sessions.get(payload.sessionId)!);
    persistState(userId);
    updateRunning(userId);
  }
};
