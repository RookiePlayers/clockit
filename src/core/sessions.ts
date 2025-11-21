import type { Session } from './types';
import { roundSeconds, addSecondsToIso } from './util';

export type IdleTrim = {
  /** milliseconds considered idle (not counted) at the tail of the session */
  tailIdleMs?: number;
};

/** Build a Session from raw timestamps and optional context. */
export function makeSession(args: {
  startedIso: string;
  endedIso?: string;
  durationSeconds?: number; // if provided, overrides endedIso diff
  idleSeconds?: number;
  linesAdded?: number;
  linesDeleted?: number;
  perFileSeconds?: Record<string, number>;
  perLanguageSeconds?: Record<string, number>;
  authorName?: string;
  authorEmail?: string;
  machine?: string;
  workspace?: string;
  repoPath?: string;
  branch?: string | null;
  issueKey?: string | null;
  comment?: string;
  meta?: Record<string, unknown>;
}): Session {
  const {
    startedIso, endedIso, durationSeconds, idleSeconds, linesAdded, linesDeleted,
    perFileSeconds, perLanguageSeconds, authorName, authorEmail, machine,
    workspace, repoPath, branch, issueKey, comment, meta
  } = args;

  let duration = durationSeconds ?? Math.max(0,
    Math.floor((new Date(endedIso ?? new Date().toISOString()).getTime() - new Date(startedIso).getTime()) / 1000)
  );

  const end = endedIso ?? addSecondsToIso(startedIso, duration);
  return {
    startedIso,
    endedIso: end,
    durationSeconds: duration,
    idleSeconds,
    linesAdded,
    linesDeleted,
    perFileSeconds,
    perLanguageSeconds,
    authorName,
    authorEmail,
    machine,
    workspace,
    repoPath,
    branch: branch ?? null,
    issueKey: issueKey ?? null,
    comment,
    meta
  };
}

/** Remove idle time from the end of a session (e.g., last N ms of inactivity). */
export function trimIdleTail(s: Session, idle: IdleTrim): Session {
  const cut = Math.max(0, Math.floor((idle.tailIdleMs ?? 0) / 1000));
  if (!cut) {return s;}
  const dur = Math.max(0, s.durationSeconds - cut);
  const endedIso = addSecondsToIso(s.startedIso, dur);
  return { ...s, durationSeconds: dur, endedIso };
}

/** Round session duration to a step (e.g., 300s) with a minimum floor. */
export function roundSession(s: Session, stepSeconds = 300, minFloorSeconds = 60): Session {
  const dur = roundSeconds(s.durationSeconds, stepSeconds, minFloorSeconds);
  const endedIso = addSecondsToIso(s.startedIso, dur);
  return { ...s, durationSeconds: dur, endedIso };
}
