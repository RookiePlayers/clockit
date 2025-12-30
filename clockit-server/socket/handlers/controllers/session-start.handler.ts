import type { SessionState } from "../../../types";
import type { HandlerDeps } from "../../../types";
export const handleSessionStart = ({ userId, payload, sessionsByUser, broadcastDelta, persistState, randomUUID, updateRunning }: HandlerDeps) => {
  if (!payload.label) {return;}
  const sessionId = payload.sessionId || `session-${randomUUID?.()??Date.now()}`;
  const sessions = sessionsByUser.get(userId)!;
  const session: SessionState = {
    sessionId,
    userId,
    label: payload.label,
    startedAt: Date.now(),
    accumulatedMs: 0,
    running: true,
    endedAt: undefined,
    pausedAt: undefined,
    goals: payload.goals || [],
    groupId: payload.groupId,
    groupName: payload.groupName,
    comment: payload.comment,
  };
  sessions.set(sessionId, session);
  broadcastDelta(userId, session);
  persistState(userId);
  updateRunning(userId);
};
