export type IsoString = string;

export type ResultCode =
  | 'missing_field'     // local validation says a required field is missing
  | 'invalid_field'     // server says this field value is invalid / not found
  | 'auth_error'        // bad credentials / forbidden
  | 'network_error'
  | 'rate_limited'
  | 'unknown';


export interface Result {
  ok: boolean;
  message?: string;
  error?: Error;
  data?: unknown;
  missing?: string[];
  code?: ResultCode;
  field?: string;
  retryable?: boolean;
  hint?: string;
}
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
