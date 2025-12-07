import * as vscode from 'vscode';
import { addGoal, addGoals, deleteGoal, getGoals, Goal, toggleGoal } from './goals-store';
import { fetchSubtaskGoals, promptJiraIssueKey } from './jira-goals';

export class GoalsTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.ProviderResult<Array<vscode.TreeItem>> {
    const goals = getGoals();
    return [
      new AddGoalItem(),
      ...goals.map((g, idx) => new GoalTreeItem(g, idx)),
    ];
  }
}

export class GoalTreeItem extends vscode.TreeItem {
  constructor(goal: Goal, public readonly index: number) {
    const label = goal.title || `Goal ${index + 1}`;
    const done = Boolean(goal.completedAt);
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(done ? 'check' : 'circle-outline');
    this.contextValue = 'clockitGoal';
    const details: string[] = [];
    details.push(`Created ${new Date(goal.createdAt).toLocaleString()}`);
    if (goal.completedAt) {
      details.push(`Completed ${new Date(goal.completedAt).toLocaleString()}`);
      if (goal.timeTaken !== undefined && goal.timeTaken !== null) {
        details.push(`Time: ${formatSeconds(goal.timeTaken)}`);
      }
    }
    this.description = done ? 'Completed' : 'Active';
    this.tooltip = `${label}\n${details.join('\n')}`;
    this.command = {
      title: 'Toggle Goal',
      command: 'clockit.goals.toggle',
      arguments: [index],
    };
    this.contextValue = 'clockitGoalItem';
  }
}

class AddGoalItem extends vscode.TreeItem {
  constructor() {
    super('Add goal…', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('add');
    this.command = {
      title: 'Add Goal',
      command: 'clockit.goals.add',
    };
    this.contextValue = 'clockitGoalAdd';
    this.tooltip = 'Click to add a new goal';
  }
}
export async function promptAddGoal() {
  const choice = await vscode.window.showQuickPick(
    [
      { label: '$(plus) Enter goal title', id: 'manual' },
      { label: '$(cloud-download) Import subtasks from Jira issue key', id: 'jira' },
    ],
    { placeHolder: 'Add goal', ignoreFocusOut: true }
  );
  if (!choice) {return;}

  if (choice.id === 'manual') {
    const title = await vscode.window.showInputBox({
      prompt: 'Goal title',
      placeHolder: 'Ship feature X',
      ignoreFocusOut: true,
      validateInput: (val) => (val.trim() ? null : 'Title required'),
    });
    if (!title) {return;}
    await addGoal(title.trim());
    return;
  }

  if (choice.id === 'jira') {
    const issueKey = await promptJiraIssueKey();
    if (!issueKey) {return;}
    const goals = await fetchSubtaskGoals(issueKey.trim());
    if (!goals.length) {
      vscode.window.showInformationMessage('No subtasks found for that issue or Jira is not connected.');
      return;
    }
    addGoals(goals);
    vscode.window.showInformationMessage(`Imported ${goals.length} goals from ${issueKey.trim()}.`);
  }
}

export async function handleToggleGoal(index?: number) {
  if (index === undefined) {
    const picked = await pickGoal('Toggle goal');
    if (picked === undefined) {return;}
    index = picked;
  }
  await toggleGoal(index);
}

export async function handleDeleteGoal(index?: number) {
  if (index === undefined) {
    const picked = await pickGoal('Delete goal');
    if (picked === undefined) {return;}
    index = picked;
  }
  await deleteGoal(index);
}

async function pickGoal(placeHolder: string) {
  const goals = getGoals();
  if (!goals.length) {
    vscode.window.showInformationMessage('No goals yet. Add one first.');
    return undefined;
  }
  const qp = await vscode.window.showQuickPick(
    goals.map((g, i) => ({
      label: `${g.completedAt ? '$(check)' : '$(circle-dotted)'} ${g.title}`,
      description: g.completedAt ? `Done in ${formatSeconds(g.timeTaken ?? 0)}` : `Created ${new Date(g.createdAt).toLocaleString()}`,
      index: i,
    })),
    { placeHolder, ignoreFocusOut: true }
  );
  return qp ? (qp as any).index as number : undefined;
}

function formatSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}
