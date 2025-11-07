import * as vscode from 'vscode';
import crypto from 'crypto';

export type OAuthProvider = {
  id: string;                     // e.g. 'jira', 'notion'
  authUrl: string;                // authorize endpoint
  tokenUrl: string;               // token endpoint
  clientId: string;
  clientSecret?: string;          // optional (PKCE-only flows don’t need it)
  scopes: string[];               // space-joined unless overridden
  redirectUri: string;            // vscode://publisher.extension/oauth/callback
  scopeParamName?: string;        // default: 'scope'
  extraAuthParams?: Record<string, string | undefined>;
  extraTokenParams?: Record<string, string | undefined>;
};

function b64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest();
}
function randomString(n = 32) {
  return b64url(crypto.randomBytes(n));
}

export class OAuthManager implements vscode.UriHandler {
  private pending = new Map<string, { resolve: (v: URL) => void; reject: (e: any) => void }>();

  constructor(private ctx: vscode.ExtensionContext) {}

  registerHandler() {
    this.ctx.subscriptions.push(vscode.window.registerUriHandler(this));
  }

  handleUri(uri: vscode.Uri) {
    if (uri.path !== '/oauth/callback') {return;}
    const url = new URL(uri.toString(true));
    const state = url.searchParams.get('state') || '';
    const entry = this.pending.get(state);
    if (entry) {
      this.pending.delete(state);
      entry.resolve(new URL(uri.toString(true)));
    }
  }

  private storageKey(providerId: string) {
    return `oauth:${providerId}:tokens`;
  }

  async getTokens(providerId: string): Promise<{ access_token: string; refresh_token?: string; expires_at?: number } | undefined> {
    const raw = await this.ctx.secrets.get(this.storageKey(providerId));
    return raw ? JSON.parse(raw) : undefined;
  }

  private async setTokens(providerId: string, tokens: any) {
    await this.ctx.secrets.store(this.storageKey(providerId), JSON.stringify(tokens));
  }

  async clearTokens(providerId: string) {
    await this.ctx.secrets.delete(this.storageKey(providerId));
  }

  async ensureAccessToken(provider: OAuthProvider): Promise<string> {
    const existing = await this.getTokens(provider.id);
    const now = Math.floor(Date.now() / 1000);

    if (existing?.access_token && existing?.expires_at && existing.expires_at - 60 > now) {
      return existing.access_token;
    }
    if (existing?.refresh_token) {
      try {
        const refreshed = await this.exchangeToken(provider, {
          grant_type: 'refresh_token',
          refresh_token: existing.refresh_token!,
          client_id: provider.clientId,
          ...(provider.clientSecret ? { client_secret: provider.clientSecret } : {}),
          ...(provider.extraTokenParams || {}),
        });
        const tokens = this.normalizeTokens(refreshed);
        await this.setTokens(provider.id, tokens);
        return tokens.access_token;
      } catch {
        // fall through to new auth
      }
    }

    const tokens = await this.runAuthCodeFlow(provider);
    await this.setTokens(provider.id, tokens);
    return tokens.access_token;
  }

  private async runAuthCodeFlow(p: OAuthProvider) {
    const state = randomString(24);
    const verifier = randomString(64);
    const challenge = b64url(sha256(verifier));

    const awaited = new Promise<URL>((resolve, reject) => {
      this.pending.set(state, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(state)) {
          this.pending.delete(state);
          reject(new Error('OAuth timed out'));
        }
      }, 5 * 60 * 1000);
    });

    const scopeParam = (p.scopeParamName ?? 'scope');
    const auth = new URL(p.authUrl);
    auth.searchParams.set('response_type', 'code');
    auth.searchParams.set('client_id', p.clientId);
    auth.searchParams.set('redirect_uri', p.redirectUri);
    if (p.scopes.length) {auth.searchParams.set(scopeParam, p.scopes.join(' '));}
    auth.searchParams.set('state', state);
    auth.searchParams.set('code_challenge', challenge);
    auth.searchParams.set('code_challenge_method', 'S256');
    auth.searchParams.set('pkce', 'S256');
    console.log(`[OAuthManager]: Initiating OAuth flow for provider ${p.id} at ${auth.toString()}`);
    Object.entries(p.extraAuthParams || {}).forEach(([k, v]) => v !== undefined && auth.searchParams.set(k, v));

    await vscode.env.openExternal(vscode.Uri.parse(auth.toString()));
    const cb = await awaited;
    const code = new URL(cb.toString()).searchParams.get('code') || '';
    if (!code) {throw new Error('OAuth: missing authorization code');}

    const tokenRes = await this.exchangeToken(p, {
      grant_type: 'authorization_code',
      code,
      client_id: p.clientId,
      redirect_uri: p.redirectUri,
      code_verifier: verifier,
      ...(p.clientSecret ? { client_secret: p.clientSecret } : {}),
      ...(p.extraTokenParams || {}),
    });

    return this.normalizeTokens(tokenRes);
  }

  private async exchangeToken(p: OAuthProvider, body: Record<string, string>) {
    const res = await fetch(p.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body as any).toString(),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`OAuth token error ${res.status}: ${t}`);
    }
    return res.json();
  }

  private normalizeTokens(json: any) {
    const now = Math.floor(Date.now() / 1000);
    const expires_in = Number(json.expires_in || json.expires || 3600);
    return {
      access_token: String(json.access_token),
      refresh_token: json.refresh_token ? String(json.refresh_token) : undefined,
      expires_at: now + expires_in,
    };
  }
}