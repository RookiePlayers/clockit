import { Result, Session } from './types';

export interface TimeSinkConfig {
  /** unique key, e.g. "csv", "jira", "notion" */
  kind: string;
  /** user-facing name */
  label?: string;
  /** on/off flag from settings */
  enabled: boolean;
  /** arbitrary config bag from settings.json */
  options: Record<string, unknown>;
}

export interface TimeSink {
  /** immutable id for diagnostics */
  readonly kind: string;
  /** validate options at activation; throw or return Result */
  validate(): Result;
  /** push one session; idempotency is sink’s job */
  export(session: Session): Promise<Result>;
  /** optional shutdown */
  dispose?(): void | Promise<void>;
}

/** Optional helper for common patterns */
export abstract class BaseSink implements TimeSink {
  public readonly kind: string;
  protected readonly options: Record<string, unknown>;
  constructor(cfg: TimeSinkConfig) {
    this.kind = cfg.kind;
    this.options = cfg.options;
  }
  validate(): Result { return { ok: true }; }
  abstract export(session: Session): Promise<Result>;
  dispose?(): void | Promise<void>;
}