import * as vscode from 'vscode';

export class Config {
  static get<T = any>(key: string) {
    return vscode.workspace.getConfiguration().get<T>(key);
  }
  static async set(key: string, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace) {
    await vscode.workspace.getConfiguration().update(key, value, target);
  }
}