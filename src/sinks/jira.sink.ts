// src/sinks/jira.sink.ts
import { OAuthProvider } from '../core/oauth';
import type { TimeSink, FieldSpec, TimeSinkConfig } from '../core/sink';
import type { Session, Result } from '../core/types';
import { BaseOAuthSink } from './base-oauth-sink';
type JiraOptions = {
  'jira.domain'?: string;
  'jira.email'?: string;
  'jira.apiToken'?: string;
  'issueKey'?: string;
};

function extractIssueKeyFrom(text?: string | null): string | null {
  if (!text) {return null;}
  const m = String(text).match(/[A-Z][A-Z0-9]+-\d+/i);
  return m ? m[0].toUpperCase() : null;
}

export class JiraSink  extends BaseOAuthSink  {
  readonly kind = 'jira';


  constructor(
    private cfg: TimeSinkConfig,
    private fetchFn: (input: any | URL, init?: RequestInit) => Promise<Response> = (globalThis as any).fetch
  ) {super(cfg);}

requirements(): FieldSpec[] {
  return [
    {
      key: 'jira.domain',
      label: 'Jira Domain',
      type: 'string',
      scope: 'setup',
      required: true,
      placeholder: 'your-team.atlassian.net',
      description: 'Your Jira Cloud hostname (no protocol).',
      validate: v => /atlassian\.net$/i.test(String(v ?? '').trim()) ? undefined : 'Must end with atlassian.net',
      settingKey: 'timeit.jira.domain',      // 👈 where to persist/read
    },
    {
      key: 'jira.email',
      label: 'Jira Email',
      type: 'string',
      scope: 'setup',
      required: true,
      validate: v => /.+@.+/.test(String(v ?? '').trim()) ? undefined : 'Invalid email',
      settingKey: 'timeit.jira.email',       // 👈 persist/read
    },
    {
      key: 'jira.apiToken',
      label: 'Jira API Token',
      type: 'secret',
      scope: 'setup',
      required: true,
      description: 'Create at https://id.atlassian.com/manage/api-tokens',
      secretKey: 'timeit.jira.apiToken',     // 👈 persist in SecretStorage
    },
    {
      key: 'issueKey',
      label: 'Jira Issue Key',
      type: 'string',
      scope: 'runtime',
      required: false,
      placeholder: 'TP-123',
      validate: v => v ? (/^[A-Z][A-Z0-9]+-\d+$/.test(String(v).toUpperCase()) ? undefined : 'Format like PROJ-123') : undefined,
      // runtime -> no settingKey/secretKey; will be injected into options/session only
    }
  ];
}
  validate() {
    const domain = (this.options['jira.domain'] || '').toString().trim();
    const email  = (this.options['jira.email']  || '').toString().trim();
    const token  = (this.options['jira.apiToken'] || '').toString().trim();

    const missing: string[] = [];
    if (!domain) {missing.push('jira.domain');}
    if (!email)  {missing.push('jira.email');}
    if (!token)  {missing.push('jira.apiToken');}

    return { ok: missing.length === 0, missing };
  }
protected provider(): OAuthProvider {
    const REDIRECT = 'vscode://octech.timeit/oauth/jira/callback'; // <-- set your real publisher/ext id

    const clientId = process.env.ATLASSIAN_CLIENT_ID || '<ATLASSIAN_CLIENT_ID>';
    const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET || '<ATLASSIAN_CLIENT_SECRET>';

    console.log(`[TimeIt]: Using Jira OAuth Client ID: ${clientId}`);
    return {
      id: 'jira',
      authUrl: 'https://auth.atlassian.com/authorize',
      tokenUrl: 'https://auth.atlassian.com/oauth/token',
      clientId: clientId,
      clientSecret: clientSecret,
      scopes: ['read:jira-work', 'write:jira-work', 'read:jira-user'],
      redirectUri: REDIRECT,
      extraAuthParams: {
        
        audience: 'api.atlassian.com', prompt: 'consent', pkce: "S256" },
    };
  }

  private async cloudInfo(accessToken: string) {
    const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!res.ok) {throw new Error(`Jira cloud listing failed ${res.status}`);}
    return res.json() as Promise<Array<{ id: string; url: string; name: string; scopes: string[] }>>;
  }

  // If you know the target site domain, prefer it; otherwise first cloud
  private async pickCloudId(accessToken: string, preferDomain?: string) {
    const clouds = await this.cloudInfo(accessToken);
    if (!clouds?.length) {throw new Error('No accessible Jira Cloud for this token');}
    if (preferDomain) {
      const hit = clouds.find(c => c.url.includes(preferDomain));
      if (hit) {return hit.id;}
    }
    return clouds[0].id;
  }

  private jiraDate(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    const tz = -d.getTimezoneOffset();
    const sign = tz >= 0 ? '+' : '-';
    const hh = pad(Math.floor(Math.abs(tz) / 60));
    const mm = pad(Math.abs(tz) % 60);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}${sign}${hh}${mm}`;
  }
 protected async exportWithToken(accessToken: string, s: Session): Promise<Result> {
    const issue = (s.issueKey ?? '').trim();
    if (!issue) {return { ok: true, message: 'Jira skipped (no issueKey)' };}

    const cloudId = await this.pickCloudId(accessToken, 'overlycreativetech.atlassian.net'); // optional preference
    const base = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;

    // Preflight visibility
    const pre = await fetch(`${base}/issue/${encodeURIComponent(issue)}?fields=id,key`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (pre.status === 404) {
      const t = await pre.text().catch(()=> '');
      return { ok: false, message: `Jira 404: ${issue} not found or not visible`, error: new Error(t) };
    }
    if (!pre.ok) {
      const t = await pre.text().catch(()=> '');
      return { ok: false, message: `Jira ${pre.status} (preflight)`, error: new Error(t) };
    }

    // Worklog
    const body = {
      timeSpentSeconds: s.durationSeconds,
      started: this.jiraDate(s.startedIso),
      comment: {
        type: 'doc', version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: s.comment || 'Logged by TimeIt' }]}],
      },
    };
    const res = await fetch(`${base}/issue/${encodeURIComponent(issue)}/worklog`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(()=> '');
      return { ok: false, message: `Jira ${res.status}`, error: new Error(t) };
    }
    return { ok: true, message: `Jira -> ${issue}` };
  }

  private baseUrl(): string {
    const raw = (this.options['jira.domain'] || '').toString().trim();
    const host = raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    return `https://${host}`;
  }

  private authHeader(): string {
    const email = (this.options['jira.email'] || '').toString();
    const token = (this.options['jira.apiToken'] || '').toString();
    const enc = typeof Buffer !== 'undefined'
      ? Buffer.from(`${email}:${token}`).toString('base64')
      : (globalThis as any).btoa?.(`${email}:${token}`);
    return `Basic ${enc}`;
  }

  private toJiraTimestamp(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    const yyyy = d.getUTCFullYear();
    const MM = pad(d.getUTCMonth() + 1);
    const dd = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());
    const mm = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}.${ms}+0000`;
  }

  async export(s: Session): Promise<Result> {
    const opts = this.options;
    const fromSession = s.issueKey || extractIssueKeyFrom(s.comment);

    const issue = (fromSession || (opts['issueKey'] || '').toString()).trim();
    if (!issue) {return { ok: true, message: 'Jira skipped (no issueKey)' };}

    const check = this.validate();
    if (!check.ok) {return { ok: false, message: `Jira missing: ${check.missing?.join(', ')}` };}

    const body = {
      timeSpentSeconds: s.durationSeconds,
      started: this.toJiraTimestamp(s.startedIso),
      comment: {
        version: 1,
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: s.comment?.trim() || 'Logged by TimeIt' }]}]
      }
    };

    const url = `${this.baseUrl()}/rest/api/3/issue/${encodeURIComponent(issue)}/worklog`;
    console.log(`[TimeIt]: JiraSink posting worklog to ${url} with body:`, body);
    try {
      const res = await this.fetchFn(url, {
        method: 'POST',
        headers: { 'Authorization': this.authHeader(), 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const text = await safeText(res);
        return { ok: false, message: `Jira ${res.status}`, error: new Error(text || 'Jira worklog failed') };
      }
      return { ok: true, message: `Jira → ${issue}` };
    } catch (e: any) {
      return { ok: false, message: 'Network error calling Jira', error: e };
    }
  }
}

async function safeText(res: Response): Promise<string> {
  try { return await res.text(); } catch { return ''; }
}