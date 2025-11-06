import * as os from 'os';
import * as path from 'path';

export function expandTilde(p?: string): string | undefined {
  if (!p) {return p;}
  if (p === '~') {return os.homedir();}
  if (p.startsWith('~/')) {return path.join(os.homedir(), p.slice(2));}
  return p;
}

export function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function secondsToHMS(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

/** Round seconds to nearest step (e.g., 300 = 5 min). Min floor enforces a lower bound. */
export function roundSeconds(sec: number, step: number, minFloor = 60) {
  const r = Math.round(sec / step) * step;
  return Math.max(r, minFloor);
}

/** Add clamped seconds to ISO start to produce a new ISO end. */
export function addSecondsToIso(startedIso: string, seconds: number) {
  const d = new Date(startedIso);
  d.setSeconds(d.getSeconds() + seconds);
  return d.toISOString();
}

export const ISSUE_KEY_REGEX = /(?:^|[^A-Z0-9])([A-Z][A-Z0-9]+-\d+)(?:$|[^A-Z0-9])/i;