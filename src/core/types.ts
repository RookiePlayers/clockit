export type IsoString = string;

export interface Session {
  startedIso: IsoString;
  endedIso: IsoString;
  /** active seconds after idle handling */
  durationSeconds: number;
  workspace?: string;
  repoPath?: string;
  branch?: string | null;
  issueKey?: string | null;
  comment?: string;
  /** arbitrary bag for future rules/integrations */
  meta?: Record<string, unknown>;
}

export interface Result {
  ok: boolean;
  message?: string;
  data?: unknown;
  error?: Error;
  missing?: string[];
}