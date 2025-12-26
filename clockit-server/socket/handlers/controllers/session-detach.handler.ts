import type { HandlerDeps } from "../../../types";

export const handleSessionDetach = ({ userId, payload, sessionsByUser, broadcastDelta, persistState, updateRunning }: HandlerDeps) => {
  if (!payload.sessionId || !payload.goalId) {return;}
  const sessions = sessionsByUser.get(userId)!;
  const existing = sessions.get(payload.sessionId);
  if (existing) {
    const goals = existing.goals.filter((g) => g.id !== payload.goalId);
    sessions.set(payload.sessionId, { ...existing, goals });
    broadcastDelta(userId, sessions.get(payload.sessionId)!);
    persistState(userId);
    updateRunning(userId);
  }
};
