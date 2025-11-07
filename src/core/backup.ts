// src/core/backup.ts
import * as fs from 'fs/promises';
import * as fssync from 'fs';
import * as path from 'path';

// NOTE: Keep vscode import optional to avoid test env issues.
// If you prefer the static import, you can keep it; this version guards usage.
let vscode: typeof import('vscode') | undefined;
try { vscode = require('vscode'); } catch {}

export type BackupRow = {
  startedIso: string;
  endedIso?: string;
  durationSeconds: number;
  workspace?: string;
  repoPath?: string;
  branch?: string | null;
  issueKey?: string | null;
  comment?: string | null;
};

type Opts = {
  enabled: boolean;
  intervalSeconds: number;
  directory?: string;       // explicit override
  filenamePrefix: string;   // e.g. "backup_"
  csvDirFallback?: string;  // CSV sink dir (if any)
};

export class BackupManager {
  private timer: NodeJS.Timeout | null = null;
  private lastFlushedAt = 0;
  private pending?: BackupRow;

  constructor(private opts: Opts) {}

  start() {
    if (!this.opts.enabled || this.timer) {return;}
    const ms = Math.max(0, this.opts.intervalSeconds) * 1000; // no hidden 10s floor
    this.timer = setInterval(() => { void this.flushTick(); }, ms);
  }

  stop() {
    if (this.timer) {clearInterval(this.timer);}
    this.timer = null;
  }

  /** Call whenever the active session updates (tick, pause/resume, etc.) */
  setPending(row?: BackupRow) {
    this.pending = row;
  }

  /** Force write now (used on deactivate / fatal error). Returns the file path if written. */
  async flushNow(): Promise<string | undefined> {
    if (!this.opts.enabled) {return;}
    return this.writeIfAny();
  }

  // ─── Internals ───────────────────────────────────────────────────────────────

  private async flushTick() {
    const now = Date.now();
    // (Light) spam guard to avoid back-to-back writes in the same tick storm
    if (now - this.lastFlushedAt < 250) {return;}
    await this.writeIfAny();
  }

  private async writeIfAny(): Promise<string | undefined> {
    if (!this.pending) {return;}

    const file = await this.resolveBackupFilePath(new Date());
    await this.ensureDir(path.dirname(file));

    const exists = fssync.existsSync(file);
    const header =
      'startedIso,endedIso,durationSeconds,workspace,repoPath,branch,issueKey,comment\n';

    const line =
      [
        csv(this.pending.startedIso),
        csv(this.pending.endedIso ?? ''),
        csv(String(this.pending.durationSeconds ?? 0)),
        csv(this.pending.workspace ?? ''),
        csv(this.pending.repoPath ?? ''),
        csv(this.pending.branch ?? ''),
        csv(this.pending.issueKey ?? ''),
        csv(this.pending.comment ?? ''),
      ].join(',') + '\n';

    if (!exists) {
      await fs.writeFile(file, header + line, 'utf8');
    } else {
      await fs.appendFile(file, line, 'utf8');
    }
    this.lastFlushedAt = Date.now();
    return file;
  }

  private async resolveBackupFilePath(d: Date): Promise<string> {
    // Use LOCAL date and hyphenated name: backup_YYYY-MM-DD.csv
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const name = `${this.opts.filenamePrefix}${yyyy}${mm}${dd}.csv`;

    // Priority: explicit backup.directory → csvDirFallback → workspace root → cwd
    const explicit = (this.opts.directory || '').trim();
    if (explicit) {return path.join(explicit, name);}
    if (this.opts.csvDirFallback) {return path.join(this.opts.csvDirFallback, name);}

    const ws = vscode?.workspace?.workspaceFolders?.[0]?.uri.fsPath;
    return path.join(ws ?? process.cwd(), name);
  }

  private async ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
  }
}

function csv(value: string) {
  // Basic CSV escaping
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}