import * as vscode from 'vscode';
import * as os from 'os';
import { execSync } from 'child_process';
import { makeSession, roundSession } from '../core/sessions';
import { Pipeline } from '../core/pipeline';
import type { Session } from '../core/types';
import { Utils } from '../utils';
import { addGoals, getGoals } from '../services/goals-store';
import { fetchSubtaskGoals } from '../services/jira-goals';

export function registerSessionCommands(ctx: vscode.ExtensionContext, utils: Utils) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('clockit.startTimeTracking', () => startSession(utils)),
    vscode.commands.registerCommand('clockit.stopTimeTracking', () => stopSession(utils)),
    vscode.commands.registerCommand('clockit.toggle', () => toggleSession(utils)),
    vscode.commands.registerCommand('clockit.pauseTimeTracking', () => pauseSession(utils)),
    vscode.commands.registerCommand('clockit.resumeTimeTracking', () => resumeSession(utils)),
    vscode.commands.registerCommand('clockit.setFocusTimer', (preset?: number | string) => setFocusTimer(utils, preset)),

    // Back-compat
    vscode.commands.registerCommand('clockit.start', () => startSession(utils)),
    vscode.commands.registerCommand('clockit.stop', () => stopSession(utils)),

    // Mark activity
    vscode.workspace.onDidChangeTextDocument(e => {
      utils.recordTextChange(e);
    }),
    vscode.window.onDidChangeActiveTextEditor(editor => {
      utils.onEditorChanged(editor);
    }),
  );
}

async function startSession(utils: Utils) {
  if (utils.isRunning()) { return; }
  utils.beginSession();
  utils.notify('Clockit started.');
}

async function stopSession(utils: Utils) {
  if (!utils.isRunning()) { return; }

  const ended = utils.endSession();

  // Base session (idle already discounted by Utils)
  let session = makeSession({
    startedIso: ended.startedIso,
    durationSeconds: ended.durationSeconds,
    workspace: vscode.workspace.name,
    repoPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
  });

  // Git context + issue key detection
  const { branch, repoPath, workspaceName, lastCommit } = await getGitContext();
  session.branch = branch;
  session.repoPath = repoPath;
  session.workspace = workspaceName;
  const commentText = session.comment ?? '';
  session.issueKey = extractIssueKey(`${branch ?? ''} ${commentText}`) ?? null;
  const identity = resolveAuthorIdentity();
  session.authorName = identity.authorName;
  session.authorEmail = identity.authorEmail;
  session.machine = identity.machine;
  session.ideName = vscode.env.appName;
  const metrics = utils.getMetricsSnapshot();
  session.idleSeconds = metrics.idleSeconds;
  session.linesAdded = metrics.linesAdded;
  session.linesDeleted = metrics.linesDeleted;
  session.perFileSeconds = metrics.perFileSeconds;
  session.perLanguageSeconds = metrics.perLanguageSeconds;
  session.title = session.comment?.trim() || lastCommit || undefined;
  if (!session.comment) {
    session.comment = lastCommit || '';
  }

  // Goals-aware comment: if completed goals exist, use them; otherwise still prompt
  let goals = getGoals();
  // If Jira is connected and we have an issueKey, pull subtasks into goals (best effort)
  if (goals.length === 0 && session.issueKey) {
    const jiraGoals = await fetchSubtaskGoals(session.issueKey);
    if (jiraGoals.length) {
      addGoals(jiraGoals);
      goals = getGoals();
    }
  }

  session.goals = goals;
  const completed = goals.filter((g) => g.completedAt);
  if (completed.length > 0) {
    const titles = completed.map((g) => g.title).join(', ');
    session.comment = `Completed goals: ${titles}`;
  } else {
    const comment = await vscode.window.showInputBox({
      prompt: 'Session comment (optional)',
      placeHolder: 'Describe what you worked on...',
      ignoreFocusOut: true,
    });
    session.comment = comment ?? (goals.length ? `Goals set: ${goals.map((g) => g.title).join(', ')}` : '');
  }

  // Round to 5m with 60s floor
  const pipeline = new Pipeline().use(s => roundSession(s, 300, 60));
  const finalSession = await pipeline.run(session);

  // Hand over to export flow
  await vscode.commands.executeCommand('clockit._exportSession', finalSession);
}

function toggleSession(utils: Utils) {
  if (!utils.isRunning()) {
    vscode.commands.executeCommand('clockit.startTimeTracking');
    return;
  }

  // If paused, a click should resume instead of stopping.
  if (utils.isPaused()) {
    vscode.commands.executeCommand('clockit.resumeTimeTracking');
    return;
  }

  vscode.commands.executeCommand('clockit.stopTimeTracking');
}

function pauseSession(utils: Utils) {
  if (utils.isPaused()) {
    utils.resumeSession();
    utils.notify('Clockit resumed.');
  } else {
    utils.pauseSession();
    utils.notify('Clockit paused.');
  }
}

function resumeSession(utils: Utils) {
  utils.resumeSession();
  utils.notify('Clockit resumed.');
}

async function setFocusTimer(utils: Utils, preset?: number | string) {
  const parseInput = (val: string): number | null => {
    const trimmed = val.trim();
    const mmss = trimmed.match(/^(\d{1,3}):([0-5]?\d)$/);
    if (mmss) {
      const minutes = Number(mmss[1]);
      const seconds = Number(mmss[2]);
      const totalMinutes = (minutes * 60 + seconds) / 60;
      return totalMinutes > 0 ? totalMinutes : null;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  let minutes: number | null = null;
  if (preset !== undefined && preset !== null) {
    if (typeof preset === 'number') {
      minutes = preset > 0 ? preset : null;
    } else if (typeof preset === 'string') {
      minutes = parseInput(preset);
    }
  }

  if (minutes === null) {
    const input = await vscode.window.showInputBox({
      prompt: 'Set a focus timer (mm:ss or minutes)',
      placeHolder: '25:00',
      ignoreFocusOut: true,
      validateInput: (val) => (parseInput(val) ? null : 'Use mm:ss (e.g., 25:00) or minutes (e.g., 25)'),
    });
    if (!input) { return; }
    minutes = parseInput(input);
  }

  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) { return; }
  utils.startFocusTimer(minutes);
}

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
      lastCommit: readLatestCommit(repo?.rootUri?.fsPath),
    };
  } catch {
    return { branch: null, repoPath: undefined, workspaceName: vscode.workspace.name, lastCommit: undefined };
  }
}

function extractIssueKey(s: string): string | null {
  const re = /(?:^|[^A-Z0-9])([A-Z][A-Z0-9]+-\d+)(?:$|[^A-Z0-9])/i;
  const m = s?.match(re);
  const key = m?.[1] || m?.[0] || null;
  return key ? key.toUpperCase() : null;
}

function resolveAuthorIdentity() {
  const cfg = vscode.workspace.getConfiguration();
  const authorName =
    (cfg.get<string>('clockit.author.name') || '').trim() ||
    readGitConfig('user.name');
  const authorEmail =
    (cfg.get<string>('clockit.author.email') || '').trim() ||
    readGitConfig('user.email');
  const machine =
    (cfg.get<string>('clockit.machineName') || '').trim() ||
    os.hostname();

  return { authorName: authorName || undefined, authorEmail: authorEmail || undefined, machine };
}

function readGitConfig(key: string) {
  try {
    return execSync(`git config --get ${key}`, {
      encoding: 'utf8',
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function readLatestCommit(cwd?: string) {
  try {
    return execSync('git log -1 --pretty=%s', {
      encoding: 'utf8',
      cwd: cwd ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}
