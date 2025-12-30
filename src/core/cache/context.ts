import { Session } from "../types";

/**
 * Example resolvers you can add:
  •	GitResolver (branch, repoPath, workspace)
  •	IssueKeyResolver (derive issueKey from branch via regex)
  •	PromptResolver (ask user for comment / override)
 */
export interface ContextResolver {
  readonly name: string;
  resolve(): Promise<Partial<Session>>;
}

export class ChainResolver implements ContextResolver {
  readonly name = 'chain';
  constructor(private resolvers: ContextResolver[]) { }
  async resolve() {
    const merged: Record<string, unknown> = {};
    for (const r of this.resolvers) { Object.assign(merged, await r.resolve()); }
    return merged as Partial<Session>;
  }
}