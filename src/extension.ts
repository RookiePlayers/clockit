// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { Pipeline } from './core/pipeline';
import { makeSession, roundSession, trimIdleTail } from './core/sessions';
import { SinkRegistry } from './core/registry';
import { CsvSink } from './sinks/csv.sink';
import { JiraSink } from './sinks/jira.sink';
import { NotionSink } from './sinks/notion.sink';
import { Session } from './core/types';
import { secondsToHMS } from './core/util';

//
// ─────────────────────────────── CORE STATE ───────────────────────────────
//

let statusBar: vscode.StatusBarItem;
let running = false;
let startedAt = 0;
let startedIso = '';
let lastActive = 0;
let tickTimer: NodeJS.Timeout | null = null;
let idleChecker: NodeJS.Timeout | null = null;

//
// ─────────────────────────────── ACTIVATION ───────────────────────────────
//

export async function activate(context: vscode.ExtensionContext) {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = 'timeit.toggle';
  statusBar.show();
  updateStatusBar();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('timeit.start', startSession),
    vscode.commands.registerCommand('timeit.stop', stopSession),
    vscode.commands.registerCommand('timeit.toggle', toggleSession),
    vscode.commands.registerCommand('timeit.openCsv', openCsvLog),
    vscode.workspace.onDidChangeTextDocument(() => (running ? (lastActive = Date.now()) : null)),
    vscode.window.onDidChangeActiveTextEditor(() => (running ? (lastActive = Date.now()) : null))
  );

  const autoStart = vscode.workspace.getConfiguration().get<boolean>('timeit.autoStartOnLaunch') ?? true;
  if (autoStart) {startSession();}
}

export function deactivate() {
  clearTimers();
}

//
// ─────────────────────────────── SESSION LIFECYCLE ───────────────────────────────
//

async function startSession() {
  if (running) {return;}
  running = true;
  startedAt = Date.now();
  startedIso = new Date().toISOString();
  lastActive = Date.now();
  startTimers();
  updateStatusBar();
  notify('TimeIt started.');
}

async function stopSession() {
  if (!running) {return;}
  running = false;
  clearTimers();
  updateStatusBar();

  const now = Date.now();
  let rawDuration = Math.max(0, Math.floor((now - startedAt) / 1000));

  const cfg = vscode.workspace.getConfiguration();
  const idleMinutes = cfg.get<number>('timeit.idleTimeoutMinutes') ?? 5;
  const idleMs = now - lastActive;
  const idleCut = idleMs > idleMinutes * 60_000 ? idleMs : 0;

  // Trim idle tail
  const session = trimIdleTail(
    makeSession({
      startedIso,
      durationSeconds: rawDuration,
      workspace: vscode.workspace.name,
      repoPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    }),
    { tailIdleMs: idleCut }
  );

  // Ask for optional comment
  const comment = await vscode.window.showInputBox({
    prompt: 'Session comment (optional)',
    placeHolder: 'Describe what you worked on...',
    ignoreFocusOut: true,
  });
  session.comment = comment ?? '';

  // Detect branch and issueKey if possible
  const { branch, repoPath, workspaceName } = await getGitContext();
  session.branch = branch;
  session.repoPath = repoPath;
  session.workspace = workspaceName;
  session.issueKey = extractIssueKey(branch ?? '') ?? null;

  // Run through pipeline
  const pipeline = new Pipeline()
    .use((s) => roundSession(s, 300, 60)); // example: 5 min rounding

  const finalSession = await pipeline.run(session);

  // Send to sinks
  await exportToSinks(finalSession);
}

function toggleSession() {
  running ? stopSession() : startSession();
}

//
// ─────────────────────────────── SINK HANDLING ───────────────────────────────
//

async function exportToSinks(session: Session) {
  const cfg = vscode.workspace.getConfiguration();
  const registry = new SinkRegistry();

  // Register sinks
  registry.register('csv', (cfg) => new CsvSink(cfg));
  registry.register('jira', (cfg) => new JiraSink(cfg));
  registry.register('notion', (cfg) => new NotionSink(cfg));

  const csvCfg = {
    kind: 'csv',
    enabled: true,
    options: {
      outputDirectory: cfg.get('timeit.csv.outputDirectory'),
      filename: cfg.get('timeit.csv.filename'),
      addHeaderIfMissing: cfg.get('timeit.csv.addHeaderIfMissing'),
    },
  };

  const jiraCfg = {
    kind: 'jira',
    enabled: cfg.get<boolean>('timeit.enableJira') ?? false,
    options: {
      domain: cfg.get('timeit.jira.domain'),
      email: cfg.get('timeit.jira.email'),
      apiToken: cfg.get('timeit.jira.apiToken'),
    },
  };

  const notionCfg = {
    kind: 'notion',
    enabled: cfg.get<boolean>('timeit.notion.enableNotion') ?? false,
    options: {
      apiToken: cfg.get('timeit.notion.apiToken'),
      databaseId: cfg.get('timeit.notion.databaseId'),
      pageId: cfg.get('timeit.notion.pageId'),
    },
  };

  const sinks = registry.create([csvCfg, jiraCfg, notionCfg]);
  const results = await Promise.allSettled(sinks.map((s) => s.export(session)));

  results.forEach((res, i) => {
    const sink = sinks[i];
    if (res.status === 'fulfilled') {
      const r = res.value;
      if (r.ok) {notify(`✅ ${sink.kind.toUpperCase()}: ${r.message ?? 'Success'}`);}
      else {notify(`⚠️ ${sink.kind.toUpperCase()}: ${r.message ?? 'Failed'}`, 'warn');}
    } else {
      notify(`❌ ${sink.kind.toUpperCase()}: ${res.reason?.message || res.reason}`, 'error');
    }
  });
}

//
// ─────────────────────────────── GIT CONTEXT ───────────────────────────────
//

async function getGitContext() {
  try {
    const gitExt = vscode.extensions.getExtension('vscode.git');
    if (!gitExt) {return { branch: null, repoPath: undefined, workspaceName: vscode.workspace.name };}
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

//
// ─────────────────────────────── UTILITIES ───────────────────────────────
//

function startTimers() {
  const idleMinutes = vscode.workspace.getConfiguration().get<number>('timeit.idleTimeoutMinutes') ?? 5;

  tickTimer = setInterval(() => {
    if (!running) {return;}
    const sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    statusBar.text = `$(watch) ${secondsToHMS(sec)} — Stop`;
  }, 1000);

  idleChecker = setInterval(() => {
    if (!running) {return;}
    const idleMs = Date.now() - lastActive;
    if (idleMs > idleMinutes * 60_000) {
      // shift start forward to skip idle period
      startedAt += idleMs;
      lastActive = Date.now();
    }
  }, 5_000);
}

function clearTimers() {
  if (tickTimer) {clearInterval(tickTimer);}
  if (idleChecker) {clearInterval(idleChecker);}
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
  if (!show) {return;}
  if (type === 'info') {vscode.window.showInformationMessage(msg);}
  else if (type === 'warn') {vscode.window.showWarningMessage(msg);}
  else {vscode.window.showErrorMessage(msg);}
}

async function openCsvLog() {
  const cfg = vscode.workspace.getConfiguration();
  const outDir = (cfg.get<string>('timeit.csv.outputDirectory') || '').trim();
  const filename = cfg.get<string>('timeit.csv.filename') || 'time_log.csv';
  const root =
    outDir ||
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ||
    require('path').join(require('os').homedir(), '.timeit');
  const full = require('path').join(root, filename);
  const uri = vscode.Uri.file(full);

  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
  } catch {
    notify('CSV file not found yet — stop a session first to create it.', 'warn');
  }
}