export type IsoString = string;
export type ResultCode = 'missing_field' | 'invalid_field' | 'auth_error' | 'network_error' | 'rate_limited' | 'unknown';
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
    title?: string;
    idleSeconds?: number;
    linesAdded?: number;
    linesDeleted?: number;
    perFileSeconds?: Record<string, number>;
    perLanguageSeconds?: Record<string, number>;
    authorName?: string;
    authorEmail?: string;
    machine?: string;
    ideName?: string;
    workspace?: string;
    repoPath?: string;
    branch?: string | null;
    issueKey?: string | null;
    comment?: string;
    /** arbitrary bag for future rules/integrations */
    meta?: Record<string, unknown>;
    goals?: Goal[];
}
export type Goal = {
    title: string;
    createdAt: string;
    completedAt?: string | null;
    timeTaken?: number | null;
};
//# sourceMappingURL=types.d.ts.map