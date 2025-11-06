import { BaseSink, TimeSinkConfig } from '../core/sink';
import { Session, Result } from '../core/types';

export class JiraSink extends BaseSink {
  constructor(cfg: TimeSinkConfig) { super({ ...cfg, kind: 'jira' }); }
  validate(): Result {
    const d = String(this.options.domain || '').trim();
    const email = String(this.options.email || '').trim();
    const token = String(this.options.apiToken || '').trim();
    if (!d || !email || !token) {return { ok: false, message: 'Missing domain/email/apiToken' };}
    return { ok: true };
  }
  private base() { return `https://${this.options.domain}`; }
  private auth() {
    const email = String(this.options.email);
    const token = String(this.options.apiToken);
    return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
  }
  async export(s: Session): Promise<Result> {
    if (!s.issueKey) {return { ok: true, message: 'No issueKey; skipping Jira' };}
    const body = {
      timeSpentSeconds: s.durationSeconds,
      started: s.startedIso,
      comment: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: s.comment || 'Logged by TimeIt' }]}] }
    };
    const res = await fetch(`${this.base()}/rest/api/3/issue/${s.issueKey}/worklog`, {
      method: 'POST',
      headers: { 'Authorization': this.auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {return { ok: false, message: `Jira ${res.status}`, error: new Error(await res.text().catch(()=>'err')) };}
    return { ok: true, message: `Jira -> ${s.issueKey}` };
  }
}