import { BaseSink, TimeSinkConfig } from '../core/sink';
import { Session, Result } from '../core/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

let vscode: typeof import('vscode') | undefined;
try { vscode = require('vscode'); } catch {}

export class CsvSink extends BaseSink {
  constructor(cfg: TimeSinkConfig) { super({ ...cfg, kind: 'csv' }); }
  validate(): Result {
    // options: { outputDirectory?: string; filename?: string; addHeaderIfMissing?: boolean }
    return { ok: true };
  }
  private expand(p?: string) {
    if (!p) {return p;}
    if (p === '~') {return os.homedir();}
    if (p.startsWith('~/')) {return path.join(os.homedir(), p.slice(2));}
    return p;
  }

  private resolveDefaultDir() {
    const ws = vscode?.workspace?.workspaceFolders?.[0]?.uri.fsPath;
    const backupDirRaw = vscode?.workspace?.getConfiguration('clockit.backup')?.get<string>('directory', '')?.trim() || '';
    const candidate = this.expand(backupDirRaw) || ws || path.join(os.homedir(), 'clockit') || process.cwd();
    const looksLikeFile = /\.[^/\\]+$/.test(candidate);
    return looksLikeFile ? path.dirname(candidate) : candidate;
  }

  async export(s: Session): Promise<Result> {
  const ensureDir = Boolean(this.options.ensureDirectory ?? true);

  const dir = this.expand(String(this.options.outputDirectory || '')) || this.resolveDefaultDir();

  const file = String(this.options.filename || 'time_log.csv');
  const addHeader = Boolean(this.options.addHeaderIfMissing ?? true);
  const p = path.join(dir, file);

  const header = 'startedIso,endedIso,durationSeconds,idleSeconds,linesAdded,linesDeleted,perFileSeconds,perLanguageSeconds,authorName,authorEmail,machine,workspace,repoPath,branch,issueKey,comment\n';
  const row = [
    s.startedIso, s.endedIso, s.durationSeconds,
    s.idleSeconds ?? 0,
    s.linesAdded ?? 0,
    s.linesDeleted ?? 0,
    JSON.stringify(s.perFileSeconds ?? {}),
    JSON.stringify(s.perLanguageSeconds ?? {}),
    s.authorName ?? '', s.authorEmail ?? '', s.machine ?? '',
    s.workspace ?? '', s.repoPath ?? '', s.branch ?? '', s.issueKey ?? '', s.comment ?? ''
  ].map(v => {
    const str = String(v ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }).join(',') + '\n';

    const homeFallbackDir = path.join(os.homedir(), 'clockit');
    const attempts = [
      { dir, path: p, isFallback: false },
      { dir: homeFallbackDir, path: path.join(homeFallbackDir, file), isFallback: true },
    ];

    let successPath: { path: string; isFallback: boolean } | null = null;

    for (const attempt of attempts) {
      try {
        if (ensureDir) {
          await fs.mkdir(attempt.dir, { recursive: true });
        } else {
          await fs.access(attempt.dir);
        }

        let exists = false;
        try {
          await fs.access(attempt.path);
          exists = true;
        } catch {
          exists = false;
        }
        const chunk = (!exists && addHeader ? header : '') + row;
        await fs.appendFile(attempt.path, chunk, 'utf8');
        successPath = { path: attempt.path, isFallback: attempt.isFallback };
        if (attempt.isFallback) {
          console.warn('[Clockit][CSV] Primary path unavailable, wrote to fallback', attempt.path);
        } else {
          console.info('[Clockit][CSV] Wrote row to', attempt.path);
        }
        break;
      } catch (e: any) {
        if (attempt.isFallback) {
          console.error('[Clockit][CSV] Fallback write failed:', e);
          return { ok: false, message: 'CSV write failed (fallback also failed)', error: e };
        }
        if (e?.code === 'EROFS' || e?.code === 'EACCES') {
          // try next attempt (fallback)
          continue;
        }
        console.error('[Clockit][CSV] Failed to write CSV:', e);
        return { ok: false, error: e };
      }
    }

    if (!successPath) {
      return { ok: false, message: 'CSV write failed and no fallback succeeded' };
    }

    let backupNote: string | undefined;
    try {
      backupNote = await this.backupToCloud(s);
      console.info('[Clockit][CSV] Cloud backup result:', backupNote);
    } catch (e: any) {
      console.warn('[Clockit][CSV] Cloud backup failed:', e);
      backupNote = `Cloud backup skipped: ${e?.message || e}`;
    }
    return {
      ok: true,
      message: `CSV -> ${successPath.path}${successPath.isFallback ? ' (fallback path)' : ''}${backupNote ? `; ${backupNote}` : ''}`,
    };
  }

  private async backupToCloud(session: Session): Promise<string | undefined> {
    const enabled = Boolean(this.options['cloud.enabled']);
    const apiUrl = String(this.options['cloud.apiUrl'] || '').trim();
    const apiToken = String(this.options['cloud.apiToken'] || '').trim();
    if (!enabled || !apiUrl || !apiToken) {return undefined;}
    try {
      const fetcher = await getFetch();
      const attempt = async (url: string) => fetcher(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ sessions: [session], source: 'vscode-plugin' }),
      });

      const primaryRes = await attempt(apiUrl);
      if (primaryRes.ok) {
        return 'Backed up to cloud';
      }

      const needsPath = !/ingestcsv/i.test(apiUrl) && !apiUrl.toLowerCase().includes('/ingestcsv');
      if (primaryRes.status === 404 && needsPath) {
        const retryUrl = `${apiUrl.replace(/\/+$/, '')}/ingestCsv`;
        const retryRes = await attempt(retryUrl);
        if (retryRes.ok) {
          console.info('[Clockit][CSV] Cloud backup succeeded via fallback URL', retryUrl);
          return 'Backed up to cloud';
        }
        const retryText = await retryRes.text().catch(() => '');
        return `Cloud backup failed (${retryRes.status})${retryText ? `: ${retryText}` : ''}`;
      }

      const text = await primaryRes.text().catch(() => '');
      return `Cloud backup failed (${primaryRes.status})${text ? `: ${text}` : ''}`;
    } catch (e: any) {
      return `Cloud backup error: ${e?.message || e}`;
    }
  }
}

async function getFetch(): Promise<typeof fetch> {
  if (typeof fetch !== 'undefined') {return fetch;}
  try {
    // CommonJS require to avoid ESM import issues in VS Code extension runtime and Jest
    const mod = require('node-fetch');
    return (mod.default || mod) as typeof fetch;
  } catch (e: any) {
    console.error('[Clockit][CSV] node-fetch load failed:', e);
    throw new Error('Fetch is not available and node-fetch could not be loaded.');
  }
}
