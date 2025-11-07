import { OAuthProvider } from '../core/oauth';
import { BaseSink, FieldSpec, TimeSinkConfig } from '../core/sink';
import { Session, Result } from '../core/types';
import { BaseOAuthSink } from './base-oauth-sink';

export class NotionSink extends BaseOAuthSink {
  kind = 'notion';
  constructor(cfg: TimeSinkConfig) { super({ ...cfg, kind: 'notion' }); }
  validate(): Result {
    const token = String(this.options.apiToken || '');
    if (!token) {return { ok: false, message: 'Missing Notion apiToken' };}
    if (!this.options.databaseId && !this.options.pageId)
      {return { ok: false, message: 'Set databaseId or pageId' };}
    return { ok: true };
  }
   protected provider(): OAuthProvider {
    const REDIRECT = 'vscode://yourpublisher.timeit/oauth/callback';
    return {
      id: 'notion',
      authUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      clientId: '<NOTION_CLIENT_ID>',
      clientSecret: '<NOTION_CLIENT_SECRET>', // Notion typically requires secret
      scopes: [], // Notion uses capabilities; leave blank
      redirectUri: REDIRECT,
    };
  }

  protected async exportWithToken(accessToken: string, s: Session): Promise<Result> {
    // Example: write a page or db item with Bearer token
    return { ok: true, message: 'Notion export not implemented yet' };
  }

  requirements(): FieldSpec[] {
      return [
        { key: 'notion.apiToken',  label: 'Notion API Token', type: 'secret', scope: 'setup', required: true },
        { key: 'notion.databaseId', label: 'Notion Database ID', type: 'string', scope: 'setup', required: false },
        { key: 'notion.pageId', label: 'Notion Page ID', type: 'string', scope: 'setup', required: false,
          description: 'Provide either Database ID or Page ID.' },
      ];
    }
  private headers() {
    return {
      'Authorization': `Bearer ${this.options.apiToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    };
  }
  async export(s: Session): Promise<Result> {
    const db = this.options.databaseId as string | undefined;
    const page = this.options.pageId as string | undefined;
    const text = `• ${s.startedIso} → ${s.endedIso} (${s.durationSeconds}s) ${s.issueKey ?? ''} ${s.branch ?? ''} ${s.comment ?? ''}`.trim();

    if (db) {
      const payload = {
        parent: { database_id: db },
        properties: {
          Name: { title: [{ text: { content: s.comment || 'Coding Session' } }] },
          Started: { date: { start: s.startedIso, end: s.endedIso } },
          DurationSeconds: { number: s.durationSeconds },
          Issue: s.issueKey ? { rich_text: [{ text: { content: s.issueKey } }] } : undefined,
          Branch: s.branch ? { rich_text: [{ text: { content: s.branch } }] } : undefined,
          Workspace: s.workspace ? { rich_text: [{ text: { content: s.workspace } }] } : undefined,
        }
      };
      const res = await fetch('https://api.notion.com/v1/pages', { method: 'POST', headers: this.headers(), body: JSON.stringify(payload) });
      if (!res.ok) {return { ok: false, message: `Notion ${res.status}`, error: new Error(await res.text().catch(()=>'')) };}
      return { ok: true, message: 'Notion -> database' };
    } else if (page) {
      const payload = { children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: text } }] } }] };
      const res = await fetch(`https://api.notion.com/v1/blocks/${page}/children`, { method: 'PATCH', headers: this.headers(), body: JSON.stringify(payload) });
      if (!res.ok) {return { ok: false, message: `Notion ${res.status}`, error: new Error(await res.text().catch(()=>'')) };}
      return { ok: true, message: 'Notion -> page' };
    }
    return { ok: true, message: 'Notion disabled' };
  }
}