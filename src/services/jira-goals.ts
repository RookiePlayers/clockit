import * as vscode from 'vscode';
import { Goal } from '../core/types';
import { loadJiraCreds } from './jira-creds';
import { searchForIssue } from './jira-search';

async function getFetch(): Promise<typeof fetch> {
  if (typeof fetch !== 'undefined') {return fetch;}
  const mod = await import('node-fetch');
  return (mod as any).default || (mod as any);
}

const authHeader = (email: string, token: string) => {
  const enc = typeof Buffer !== 'undefined'
    ? Buffer.from(`${email}:${token}`).toString('base64')
    : (globalThis as any).btoa?.(`${email}:${token}`);
  return `Basic ${enc}`;
};

export async function promptJiraIssueKey(): Promise<string | undefined> {
  const creds = await loadJiraCreds();
  if (!creds) {
    vscode.window.showInformationMessage('Jira is not configured. Set domain/email/apiToken first.');
    return undefined;
  }

  const fetcher = await getFetch();
  const qp = vscode.window.createQuickPick<{ label: string; description?: string; key: string }>();
  qp.placeholder = 'Search Jira issues (type to search, e.g., ABC-123 or a summary)';
  qp.matchOnDescription = true;
  qp.ignoreFocusOut = true;

  let currentToken = 0;
  const load = async (value: string) => {
    const token = ++currentToken;
    qp.busy = true;
    qp.items = [];
    try {
      const res = await searchForIssue({
        query: value.trim(),
        options: {
          'jira.domain': creds.domain,
          'jira.email': creds.email,
          'jira.apiToken': creds.token,
        },
        fetchFn: fetcher,
        authHeader: () => authHeader(creds.email, creds.token),
      });
      if (token !== currentToken) {return;}
      qp.items = res.items.map((i) => ({
        label: i.title,
        description: i.description ?? '',
        key: i.id,
      }));
    } catch {
      if (token !== currentToken) {return;}
      qp.items = [];
    } finally {
      if (token === currentToken) {qp.busy = false;}
    }
  };

  qp.onDidChangeValue((value) => { void load(value); });

  const selectionPromise = new Promise<string | undefined>((resolve) => {
    qp.onDidAccept(() => {
      const sel = qp.selectedItems[0];
      resolve(sel?.key);
      qp.hide();
    });
    qp.onDidHide(() => resolve(undefined));
  });

  qp.show();
  void load('');
  const picked = await selectionPromise;
  qp.dispose();
  return picked;
}

export async function fetchSubtaskGoals(issueKey: string): Promise<Goal[]> {
  const cfg = vscode.workspace.getConfiguration();
  const enabled = cfg.get<boolean>('clockit.goals.importFromJiraSubtasks', true);
  if (!enabled) {return [];}

  const creds = await loadJiraCreds(cfg);
  if (!creds) {return [];}

  try {
    const fetcher = await getFetch();
    const auth = authHeader(creds.email, creds.token);

    const issueUrl = `https://${creds.domain.replace(/^https?:\/\//, '')}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=subtasks`;
    const res = await fetcher(issueUrl, {
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json() as { fields?: { subtasks?: Array<{ key: string; fields?: { summary?: string } }> } };
    const subtasks = data?.fields?.subtasks ?? [];
    const now = new Date().toISOString();
    const goals: Goal[] = [];
    for (const st of subtasks) {
      let title = st.fields?.summary?.trim();
      if (!title) {
        try {
          const detailRes = await fetcher(`https://${creds.domain.replace(/^https?:\/\//, '')}/rest/api/3/issue/${encodeURIComponent(st.key)}?fields=summary`, {
            headers: {
              'Authorization': auth,
              'Accept': 'application/json',
            },
          });
          if (detailRes.ok) {
            const detail = await detailRes.json() as { fields?: { summary?: string } };
            title = detail.fields?.summary?.trim();
          }
        } catch {
          // ignore per-subtask failures
        }
      }
      if (title) {
        goals.push({ title, createdAt: now, completedAt: null, timeTaken: null });
      }
    }
    return goals;
  } catch {
    return [];
  }
}
