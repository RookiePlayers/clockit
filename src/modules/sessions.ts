import * as vscode from 'vscode';
import * as os from 'os';
import { execSync } from 'child_process';
import { makeSession, roundSession } from '../core/sessions';
import { Pipeline } from '../core/pipeline';
import type { Session } from '../core/types';
import { Utils } from '../utils';

export function registerSessionCommands(ctx: vscode.ExtensionContext, utils: Utils) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('clockit.startTimeTracking', () => startSession(utils)),
    vscode.commands.registerCommand('clockit.stopTimeTracking',  () => stopSession(utils)),
    vscode.commands.registerCommand('clockit.toggle',            () => toggleSession(utils)),

    // Back-compat
    vscode.commands.registerCommand('clockit.start',             () => startSession(utils)),
    vscode.commands.registerCommand('clockit.stop',              () => stopSession(utils)),

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
  if (utils.isRunning()) {return;}
  utils.beginSession();
  utils.notify('Clockit started.');
}

async function stopSession(utils: Utils) {
  if (!utils.isRunning()) {return;}

  const ended = utils.endSession();

  // Base session (idle already discounted by Utils)
  let session = makeSession({
    startedIso: ended.startedIso,
    durationSeconds: ended.durationSeconds,
    workspace: vscode.workspace.name,
    repoPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
  });

  // Optional comment
  const comment = await vscode.window.showInputBox({
    prompt: 'Session comment (optional)',
    placeHolder: 'Describe what you worked on...',
    ignoreFocusOut: true,
  });
  session.comment = comment ?? '';

  // Git context + issue key detection
  const { branch, repoPath, workspaceName, lastCommit } = await getGitContext();
  session.branch = branch;
  session.repoPath = repoPath;
  session.workspace = workspaceName;
  session.issueKey = extractIssueKey(`${branch ?? ''} ${comment ?? ''}`) ?? null;
  const identity = resolveAuthorIdentity();
  session.authorName = identity.authorName;
  session.authorEmail = identity.authorEmail;
  session.machine = identity.machine;
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

  // Round to 5m with 60s floor
  const pipeline = new Pipeline().use(s => roundSession(s, 300, 60));
  const finalSession = await pipeline.run(session);

  // Hand over to export flow
  await vscode.commands.executeCommand('clockit._exportSession', finalSession);
}

function toggleSession(utils: Utils) {
  utils.isRunning()
    ? vscode.commands.executeCommand('clockit.stopTimeTracking')
    : vscode.commands.executeCommand('clockit.startTimeTracking');
}

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
