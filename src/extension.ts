import * as vscode from 'vscode';

import { Pipeline } from './core/pipeline';
import { makeSession, roundSession, trimIdleTail } from './core/sessions';
import { SinkRegistry } from './core/registry';
import { CsvSink } from './sinks/csv.sink';
import { JiraSink } from './sinks/jira.sink';
import { NotionSink } from './sinks/notion.sink';
import { Session } from './core/types';
import { secondsToHMS } from './core/util';

import { PromptService } from './core/prompts';
import { globalSecretStore } from './core/secret-store';
import { ExportOrchestrator } from './core/orchestrator';
import type { FieldSpec, TimeSink } from './core/sink';

let statusBar: vscode.StatusBarItem;
let running = false;
let startedAt = 0;
let startedIso = '';
let lastActive = 0;
let tickTimer: NodeJS.Timeout | null = null;
let idleChecker: NodeJS.Timeout | null = null;
let channel: vscode.OutputChannel;
let ctx: vscode.ExtensionContext;

export async function activate(context: vscode.ExtensionContext) {
  ctx = context;
  channel = vscode.window.createOutputChannel('TimeIt');
  channel.appendLine('[TimeIt] activated');

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = 'timeit.toggle';
  statusBar.show();

  const gear = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
  gear.text = '$(folder) CSV Folder';
  gear.tooltip = 'Choose TimeIt CSV Output Folder';
  gear.command = 'timeit.chooseCsvFolder';
  gear.show();
  context.subscriptions.push(gear);

  updateStatusBar();

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('timeit.startTimeTracking', startSession),
    vscode.commands.registerCommand('timeit.stopTimeTracking', stopSession),
    vscode.commands.registerCommand('timeit.toggle', toggleSession),
    vscode.commands.registerCommand('timeit.openCsv', openCsvLog),
    vscode.commands.registerCommand('timeit.chooseCsvFolder', chooseCsvFolder),

    // New UX commands
    vscode.commands.registerCommand('timeit.chooseSinks', chooseSinksCommand),
    vscode.commands.registerCommand('timeit.editCredentials', editCredentialsCommand),
    vscode.commands.registerCommand('timeit.clearCredentials', clearCredentialsCommand),

    // Back-compat
    vscode.commands.registerCommand('timeit.start', startSession),
    vscode.commands.registerCommand('timeit.stop', stopSession),

    vscode.workspace.onDidChangeTextDocument(() => { if (running) { lastActive = Date.now(); } }),
    vscode.window.onDidChangeActiveTextEditor(() => { if (running) { lastActive = Date.now(); } }),
  );

  const autoStart = vscode.workspace.getConfiguration().get<boolean>('timeit.autoStartOnLaunch') ?? true;
  if (autoStart) { startSession(); }
}

export function deactivate() {
  clearTimers();
}

// ─────────────────────────────── SESSION LIFECYCLE ───────────────────────────────

async function startSession() {
  if (running) { return; }
  running = true;
  startedAt = Date.now();
  startedIso = new Date().toISOString();
  lastActive = Date.now();
  startTimers();
  updateStatusBar();
  notify('TimeIt started.');
}

async function stopSession() {
  if (!running) { return; }
  running = false;
  clearTimers();
  updateStatusBar();

  const now = Date.now();
  const rawDuration = Math.max(0, Math.floor((now - startedAt) / 1000));

  const cfg = vscode.workspace.getConfiguration();
  const idleMinutes = cfg.get<number>('timeit.idleTimeoutMinutes') ?? 5;
  const idleMs = now - lastActive;
  const idleCut = idleMs > idleMinutes * 60_000 ? idleMs : 0;

  let session = trimIdleTail(
    makeSession({
      startedIso,
      durationSeconds: rawDuration,
      workspace: vscode.workspace.name,
      repoPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    }),
    { tailIdleMs: idleCut },
  );

  const comment = await vscode.window.showInputBox({
    prompt: 'Session comment (optional)',
    placeHolder: 'Describe what you worked on...',
    ignoreFocusOut: true,
  });
  session.comment = comment ?? '';

  const { branch, repoPath, workspaceName } = await getGitContext();
  session.branch = branch;
  session.repoPath = repoPath;
  session.workspace = workspaceName;

  session.issueKey = extractIssueKey(`${branch ?? ''} ${comment ?? ''}`) ?? null;

  const jiraEnabledLegacy = vscode.workspace.getConfiguration().get<boolean>('timeit.enableJira') ?? false;
  log('Legacy Jira enabled flag (ignored if sink picker is used):', jiraEnabledLegacy, 'Issue Key:', session.issueKey);

  const pipeline = new Pipeline().use(s => roundSession(s, 300, 60));
  const finalSession = await pipeline.run(session);

  await exportViaOrchestrator(finalSession);
}

function toggleSession() {
  running ? stopSession() : startSession();
}

// ─────────────────────────────── SINK SELECTION + EXPORT ─────────────────────────

async function exportViaOrchestrator(session: Session) {
  const cfg = vscode.workspace.getConfiguration();
  const enabledSinksSetting = cfg.get<string[]>('timeit.enabledSinks');
  const askEveryTime = cfg.get<boolean>('timeit.askSinksEachTime') ?? true;

  // Always prompt which sinks to use *before* export (your requirement).
  const sinksToUse = await promptForSinks(enabledSinksSetting);
  if (!sinksToUse || sinksToUse.length === 0) {
    notify('No sinks selected. Skipping export.', 'warn');
    return;
  }
  // Persist selection unless askEveryTime is true
  if (!askEveryTime) {
    await cfg.update('timeit.enabledSinks', sinksToUse, vscode.ConfigurationTarget.Workspace);
  }

  const registry = new SinkRegistry();
  registry.register('csv', (c) => new CsvSink(c));
  registry.register('jira', (c) => new JiraSink(c));
  registry.register('notion', (c) => new NotionSink(c));

  const sinkConfigs = [
    {
      kind: 'csv',
      enabled: sinksToUse.includes('csv'),
      options: {
        outputDirectory: cfg.get('timeit.csv.outputDirectory'),
        filename: cfg.get('timeit.csv.filename'),
        addHeaderIfMissing: cfg.get('timeit.csv.addHeaderIfMissing'),
        ensureDirectory: cfg.get('timeit.csv.ensureDirectory'),
      },
    },
    {
      kind: 'jira',
      enabled: sinksToUse.includes('jira'),
      options: {
        issueKey: session.issueKey ?? undefined,
      },
    },
    {
      kind: 'notion',
      enabled: sinksToUse.includes('notion'),
      options: {},
    },
  ];

  const sinks = registry.create(sinkConfigs);
  const orchestrator = new ExportOrchestrator(sinks, new PromptService(globalSecretStore(ctx)));
  const results = await orchestrator.hydrateAndExport(session);

  results.forEach((r: any) => {
    if (r.ok) { notify(`✅ ${r.kind.toUpperCase()}: ${r.message ?? 'Success'}`); }
    else { notify(`❌ ${r.kind.toUpperCase()}: ${r.message ?? 'Failed'}`, 'error'); }
  });
}

/** Command palette: manually choose sinks and persist */
async function chooseSinksCommand() {
  const picks = await promptForSinks(
    vscode.workspace.getConfiguration().get<string[]>('timeit.enabledSinks') ?? ['csv']
  );
  if (!picks) { return; }
  await vscode.workspace.getConfiguration().update('timeit.enabledSinks', picks, vscode.ConfigurationTarget.Workspace);
  vscode.window.showInformationMessage(`TimeIt sinks set to: ${picks.join(', ')}`);
}

/** Always prompt before export (with current setting as default checks). */
async function promptForSinks(current?: string[]) {
  const all = ['csv', 'jira', 'notion'];
  const selected = new Set(current && current.length ? current : ['csv']);
  const picks = await vscode.window.showQuickPick(
    all.map(v => ({ label: v.toUpperCase(), picked: selected.has(v), value: v })),
    { canPickMany: true, title: 'Select export sinks for this session' }
  );
  if (!picks) { return undefined; }
  return picks.map(p => p.value);
}

// ─────────────────────────────── CREDENTIALS UX ──────────────────────────────

/** Edit credentials: choose a sink, show a prefilled “form”, and save changes. */
async function editCredentialsCommand() {
  const sinkKind = await vscode.window.showQuickPick(['jira', 'notion', 'csv'], {
    title: 'Which sink credentials do you want to edit?',
    canPickMany: false
  });
  if (!sinkKind) {return;}

  const sink = instantiateSingleSinkForKind(sinkKind);
  if (!sink?.requirements) {
    vscode.window.showWarningMessage(`No editable credentials for "${sinkKind}"`);
    return;
  }

  const setupFields = sink.requirements().filter(r => r.scope === 'setup');
  if (setupFields.length === 0) {
    vscode.window.showWarningMessage(`No setup fields to edit for "${sinkKind}"`);
    return;
  }

  const secrets = globalSecretStore(ctx);
  const cfg = vscode.workspace.getConfiguration();

  // read → prompt (prefilled) → validate → persist
  for (const spec of setupFields) {
    const existing = await readStoredValue(spec, secrets, cfg);
    const edited = await promptFieldEdit(spec, existing);
    if (edited === undefined) {
      // user cancelled this field -> stop the flow cleanly
      vscode.window.showWarningMessage('Edit cancelled.');
      return;
    }
    const err = spec.validate?.(edited);
    if (err) {
      vscode.window.showErrorMessage(`${spec.label}: ${err}`);
      return;
    }
    await persistValue(spec, edited, secrets, cfg);
  }

  vscode.window.showInformationMessage(`Saved credentials for "${sinkKind}".`);
}

/** Clear credentials: pick sink (or All) then delete stored values. */
async function clearCredentialsCommand() {
  const which = await vscode.window.showQuickPick(['All', 'jira', 'notion', 'csv'], {
    title: 'Clear which credentials?',
    canPickMany: false
  });
  if (!which) {return;}

  const confirm = await vscode.window.showWarningMessage(
    `This will remove stored ${which === 'All' ? 'ALL' : which} credentials. Continue?`,
    { modal: true }, 'Yes', 'No'
  );
  if (confirm !== 'Yes') {return;}

  const secrets = globalSecretStore(ctx);
  const cfg = vscode.workspace.getConfiguration();

  if (which === 'All') {
    await clearAllSecrets(secrets);
    await clearKnownSettings(cfg);
  } else {
    const sink = instantiateSingleSinkForKind(which);
    const fields = sink?.requirements?.().filter(f => f.scope === 'setup') ?? [];
    for (const f of fields) {
      await deleteValue(f, secrets, cfg);
    }
  }
  vscode.window.showInformationMessage(`Cleared ${which} credentials.`);
}

// Helpers: instantiate a single sink so we can read its FieldSpec
function instantiateSingleSinkForKind(kind: string): TimeSink | undefined {
  const reg = new SinkRegistry();
  reg.register('csv', (c) => new CsvSink(c));
  reg.register('jira', (c) => new JiraSink(c));
  reg.register('notion', (c) => new NotionSink(c));

  const baseCfg = { kind, enabled: true, options: {} };
  const all = reg.create([baseCfg as any]);
  return all[0];
}

// Field IO helpers
async function readStoredValue(
  spec: FieldSpec,
  secrets: { get(k: string): Promise<string | undefined> },
  cfg: vscode.WorkspaceConfiguration
): Promise<unknown> {
  if (spec.type === 'secret') {
    const key = spec.secretKey || `timeit.${spec.key}`;
    const v = await secrets.get(key);
    if (exists(v)) {return v;}
  }
  if (spec.settingKey) {
    const v = cfg.get(spec.settingKey);
    if (exists(v)) {return v;}
  }
  const fallback = cfg.get(spec.key);
  return exists(fallback) ? fallback : undefined;
}

async function persistValue(
  spec: FieldSpec,
  value: unknown,
  secrets: { set(k: string, v: string): Promise<void> },
  cfg: vscode.WorkspaceConfiguration
) {
  if (spec.type === 'secret') {
    const key = spec.secretKey || `timeit.${spec.key}`;
    await secrets.set(key, String(value ?? ''));
    return;
  }
  const k = spec.settingKey || spec.key;
  await cfg.update(k, value, vscode.ConfigurationTarget.Workspace);
}

async function deleteValue(
  spec: FieldSpec,
  secrets: { delete(k: string): Promise<void> },
  cfg: vscode.WorkspaceConfiguration
) {
  if (spec.type === 'secret') {
    const key = spec.secretKey || `timeit.${spec.key}`;
    await secrets.delete(key).catch(() => {});
    return;
  }
  const k = spec.settingKey || spec.key;
  await cfg.update(k, undefined, vscode.ConfigurationTarget.Workspace);
}

async function clearAllSecrets(secrets: { keys(): Promise<string[]>; delete(k: string): Promise<void> }) {
  const all = await secrets.keys();
  await Promise.all(all.filter(k => k.startsWith('timeit.')).map(k => secrets.delete(k).catch(()=>{})));
}

async function clearKnownSettings(cfg: vscode.WorkspaceConfiguration) {
  const keys = [
    'timeit.jira.domain', 'timeit.jira.email',
    'timeit.notion.databaseId', 'timeit.notion.pageId',
    'timeit.enabledSinks'
  ];
  await Promise.all(keys.map(k => cfg.update(k, undefined, vscode.ConfigurationTarget.Workspace)));
}

async function promptFieldEdit(spec: FieldSpec, existing: unknown): Promise<unknown> {
  const base = {
    title: `Edit: ${spec.label}`,
    prompt: spec.description || spec.label,
    placeHolder: spec.placeholder,
    ignoreFocusOut: true,
    value: typeof existing === 'string' || typeof existing === 'number' ? String(existing) : undefined,
  };

  switch (spec.type) {
    case 'secret':
      return vscode.window.showInputBox({ ...base, password: true });
    case 'string':
      return vscode.window.showInputBox(base);
    case 'number': {
      const v = await vscode.window.showInputBox({
        ...base,
        validateInput: (s) => (isNaN(Number(s)) ? 'Enter a number' : undefined)
      });
      return exists(v) ? Number(v) : undefined;
    }
    case 'boolean': {
      const pick = await vscode.window.showQuickPick(['Yes', 'No'], {
        title: spec.label, placeHolder: spec.placeholder, ignoreFocusOut: true
      });
      return pick === 'Yes';
    }
    default:
      return vscode.window.showInputBox(base);
  }
}

// ─────────────────────────────── GIT CONTEXT ───────────────────────────────

async function getGitContext() {
  try {
    const gitExt = vscode.extensions.getExtension('vscode.git');
    if (!gitExt) { return { branch: null, repoPath: undefined, workspaceName: vscode.workspace.name }; }
    const api = gitExt.isActive ? gitExt.exports : await gitExt.activate();
    const repo = api.getAPI(1).repositories[0];
    return {
      branch: repo?.state?.HEAD?.name ?? null,
      repoPath: repo?.rootUri?.fsPath,
      workspaceName: vscode.workspace.name,
    };
  } catch {
    return { branch: null, repoPath: undefined, workspaceName: vscode.workspace.name };
  }
}

function extractIssueKey(s: string): string | null {
  const re = /(?:^|[^A-Z0-9])([A-Z][A-Z0-9]+-\d+)(?:$|[^A-Z0-9])/i;
  const m = s?.match(re);
  const key = m?.[1] || m?.[0] || null;
  return key ? key.toUpperCase() : null;
}

// ─────────────────────────────── UTILITIES ───────────────────────────────

function startTimers() {
  const idleMinutes = vscode.workspace.getConfiguration().get<number>('timeit.idleTimeoutMinutes') ?? 5;

  tickTimer = setInterval(() => {
    if (!running) { return; }
    const sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    statusBar.text = `$(watch) ${secondsToHMS(sec)} — Stop`;
  }, 1000);

  idleChecker = setInterval(() => {
    if (!running) { return; }
    const idleMs = Date.now() - lastActive;
    if (idleMs > idleMinutes * 60_000) {
      startedAt += idleMs;
      lastActive = Date.now();
    }
  }, 5_000);
}

function clearTimers() {
  if (tickTimer) { clearInterval(tickTimer); }
  if (idleChecker) { clearInterval(idleChecker); }
  tickTimer = idleChecker = null;
}

function updateStatusBar() {
  if (running) {
    const sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    statusBar.text = `$(watch) ${secondsToHMS(sec)} — Stop`;
    statusBar.tooltip = 'Click to stop & log';
  } else {
    statusBar.text = '$(watch) Start';
    statusBar.tooltip = 'Click to start logging';
  }
}

function notify(msg: string, type: 'info' | 'warn' | 'error' = 'info') {
  const show = vscode.workspace.getConfiguration().get<boolean>('timeit.showNotifications') ?? true;
  if (!show) { return; }
  if (type === 'info') { vscode.window.showInformationMessage(msg); }
  else if (type === 'warn') { vscode.window.showWarningMessage(msg); }
  else { vscode.window.showErrorMessage(msg); }
}

async function openCsvLog() {
  const cfg = vscode.workspace.getConfiguration();
  const outDir = (cfg.get<string>('timeit.csv.outputDirectory') || '').trim();
  const filename = cfg.get<string>('timeit.csv.filename') || 'time_log.csv';

  const path = await import('path');
  const os = await import('os');

  const root =
    outDir ||
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ||
    path.join(os.homedir(), '.timeit');

  const full = path.join(root, filename);
  const uri = vscode.Uri.file(full);

  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
  } catch {
    notify('CSV file not found yet — stop a session first to create it.', 'warn');
  }
}

async function chooseCsvFolder() {
  const selection = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Use this folder for TimeIt CSV',
    defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
  });
  if (!selection || selection.length === 0) { return; }

  const folderUri = selection[0];
  const cfg = vscode.workspace.getConfiguration();
  await cfg.update('timeit.csv.outputDirectory', folderUri.fsPath, vscode.ConfigurationTarget.Workspace);

  const ensure = cfg.get<boolean>('timeit.csv.ensureDirectory') ?? true;
  if (ensure) {
    const fs = await import('fs/promises');
    await fs.mkdir(folderUri.fsPath, { recursive: true }).catch(() => { });
  }
  vscode.window.showInformationMessage(`TimeIt CSV folder set to: ${folderUri.fsPath}`);
}

function log(...args: any[]) {
  const line = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  channel.appendLine(`[${new Date().toISOString()}] ${line}`);
  console.log('[TimeIt]', ...args);
}

function exists<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined && (typeof v !== 'string' || v.trim() !== '');
}