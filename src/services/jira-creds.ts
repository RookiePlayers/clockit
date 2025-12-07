import type * as vscode from 'vscode';

let secretStore: vscode.SecretStorage | null = null;

export function setJiraSecretStore(store: vscode.SecretStorage) {
  secretStore = store;
}

export async function loadJiraCreds(cfg?: vscode.WorkspaceConfiguration): Promise<{ domain: string; email: string; token: string } | null> {
  const config = cfg ?? (await import('vscode')).workspace.getConfiguration();
  const domain = (config.get<string>('clockit.jira.domain') || '').trim();
  const email = (config.get<string>('clockit.jira.email') || '').trim();
  let token = (config.get<string>('clockit.jira.apiToken') || '').trim();

  if (!token && secretStore) {
    const stored = await secretStore.get('clockit.jira.apiToken');
    token = stored?.trim() || '';
  }

  if (!domain || !email || !token) {return null;}
  return { domain, email, token };
}
