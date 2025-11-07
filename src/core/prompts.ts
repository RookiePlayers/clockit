// src/core/prompts.ts
import * as vscode from 'vscode';
import { FieldSpec } from './sink';

/**
 * PromptService
 * - Reads existing values from SecretStorage / settings
 * - Prompts when missing (supports string/number/boolean/secret)
 * - Validates (with up to 2 retries on error)
 * - Persists based on FieldSpec (secrets -> SecretStorage; settings -> workspace config)
 */
export class PromptService {
  constructor(
    private secrets: { get(k: string): Promise<string | undefined>; set(k: string, v: string): Promise<void>; delete?(k: string): Promise<void> }
  ) {}

  /**
   * Resolve one field:
   * 1) prefer `current` (caller-provided), else existing (secret/settings),
   * 2) if required and still empty → prompt (with validation),
   * 3) persist unless spec.persist === 'memory'
   */
  async resolveField(spec: FieldSpec, current?: unknown): Promise<unknown> {
    // 1) Prefer caller-provided current
    if (exists(current)) {return current;}

    // 2) Read existing (secret -> settings -> fallback key)
    const existing = await this.readExisting(spec);
    if (exists(existing)) {return existing;}

    // If not required, we’re done (undefined)
    if (!spec.required) {return undefined;}

    // 3) Prompt (with up to 2 validation retries)
    const value = await this.promptWithValidation(spec);
    if (!exists(value)) {return undefined;} // user canceled

    // 4) Persist (unless explicitly memory-only)
    if (spec.persist !== 'memory') {
      await this.persist(spec, value);
    }

    return value;
  }

  /**
   * Try: secret first, then configured settingKey, then fallback to direct key lookup.
   */
  private async readExisting(spec: FieldSpec): Promise<unknown> {
    // Secret first (for tokens/passwords)
    if (spec.type === 'secret') {
      const key = spec.secretKey || `timeit.${spec.key}`;
      const v = await this.secrets.get(key);
      if (exists(v)) {return v;}
    }

    // Named setting path, if provided (e.g. "timeit.jira.domain")
    if (spec.settingKey) {
      const v = vscode.workspace.getConfiguration().get(spec.settingKey);
      if (exists(v)) {return v;}
    }

    // Fallback to a setting with the same name as the field key
    const fallback = vscode.workspace.getConfiguration().get(spec.key);
    return exists(fallback) ? fallback : undefined;
  }

  /**
   * Persist to SecretStorage or workspace settings.
   * - Secret: spec.secretKey || `timeit.${spec.key}`
   * - Setting: spec.settingKey || spec.key (workspace scope)
   */
  private async persist(spec: FieldSpec, value: unknown) {
    if (spec.type === 'secret') {
      const key = spec.secretKey || `timeit.${spec.key}`;
      await this.secrets.set(key, String(value ?? ''));
      return;
    }

    const k = spec.settingKey || spec.key;
    await vscode.workspace.getConfiguration().update(
      k,
      value,
      vscode.ConfigurationTarget.Workspace
    );
  }

  /**
   * Prompt user for a value, validate it, and allow up to 2 retries on validation error.
   */
  private async promptWithValidation(spec: FieldSpec): Promise<unknown> {
    let attempts = 0;
    while (attempts < 3) {
      const input = await this.promptOnce(spec);
      if (!exists(input)) {return undefined;} // user canceled

      const err = spec.validate?.(input);
      if (!err) {return input;}

      attempts++;
      await vscode.window.showErrorMessage(`${spec.label}: ${err}`);
      // loop to retry
    }
    return undefined;
  }

  /**
   * One-shot prompt according to type.
   */
  private async promptOnce(spec: FieldSpec): Promise<unknown> {
    const base = {
      title: spec.label,
      prompt: spec.description || spec.label,
      placeHolder: spec.placeholder,
      ignoreFocusOut: true,
      value: spec.defaultValue as string | undefined,
    } as const;

    switch (spec.type) {
      case 'secret':
        return vscode.window.showInputBox({ ...base, password: true });

      case 'string':
        return vscode.window.showInputBox(base);

      case 'number': {
        const raw = await vscode.window.showInputBox({
          ...base,
          validateInput: (s) => (s.trim() === '' || isNaN(Number(s)) ? 'Enter a number' : undefined),
        });
        return exists(raw) ? Number(raw) : undefined;
      }

      case 'boolean': {
        const pick = await vscode.window.showQuickPick(['Yes', 'No'], {
          title: spec.label,
          placeHolder: spec.placeholder,
          ignoreFocusOut: true,
        });
        if (!pick) {return undefined;}
        return pick === 'Yes';
      }

      default:
        // fallback to a regular input
        return vscode.window.showInputBox(base);
    }
  }
}

function exists<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined && (typeof v !== 'string' || v.trim() !== '');
}