import { OAuthProvider, OAuthManager } from "../core/oauth";
import { BaseSink, FieldSpec, TimeSink, TimeSinkConfig } from "../core/sink";

export abstract class BaseOAuthSink extends BaseSink {
  abstract readonly kind: string;
  public options: Record<string, unknown>;

  constructor(cfg: TimeSinkConfig) {
    super(cfg);
    this.options = { ...(cfg?.options || {}) };
  }

  // Each sink returns its embedded provider config:
  protected abstract provider(): OAuthProvider;

  // Child must implement the actual API call(s) with the token:
  protected abstract exportWithToken(
    accessToken: string,
    session: any
  ): Promise<{ ok: boolean; message?: string; error?: any }>;

  requirements(): FieldSpec[] { return []; }
  validate() { return { ok: true }; }

  async export(session: any, oauth?: OAuthManager) {
    if (!oauth) {return { ok: false, message: 'OAuth manager not provided' };}
    const token = await oauth.ensureAccessToken(this.provider());
    return this.exportWithToken(token, session);
  }
}