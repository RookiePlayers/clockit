import type * as vscode from 'vscode';

export type Goal = {
  title: string;
  createdAt: string;         // ISO string
  completedAt?: string | null;
  timeTaken?: number | null; // seconds
};

const STORAGE_KEY = 'clockit.goals';

let ctx: vscode.ExtensionContext | null = null;
let fallbackGoals: Goal[] = [];

export function initGoalsStore(context: vscode.ExtensionContext) {
  ctx = context;
}

function readGoals(): Goal[] {
  if (!ctx) {return fallbackGoals;}
  const stored = ctx.globalState.get<Goal[]>(STORAGE_KEY);
  fallbackGoals = stored ?? fallbackGoals;
  return stored ?? [];
}

function writeGoals(goals: Goal[]) {
  fallbackGoals = goals;
  void ctx?.globalState.update(STORAGE_KEY, goals);
}

export function getGoals(): Goal[] {
  return [...readGoals()];
}

export function addGoals(goals: Goal[]) {
  const existing = readGoals();
  writeGoals([...existing, ...goals]);
}

export async function addGoal(title: string): Promise<Goal[]> {
  const goals = readGoals();
  const now = new Date().toISOString();
  goals.push({ title, createdAt: now, completedAt: null, timeTaken: null });
  writeGoals(goals);
  return goals;
}

export async function toggleGoal(index: number): Promise<Goal[]> {
  const goals = readGoals();
  const goal = goals[index];
  if (!goal) {return goals;}
  if (goal.completedAt) {
    goal.completedAt = null;
    goal.timeTaken = null;
  } else {
    const now = new Date();
    goal.completedAt = now.toISOString();
    const created = new Date(goal.createdAt).getTime();
    goal.timeTaken = Math.max(0, Math.floor((now.getTime() - created) / 1000));
  }
  goals[index] = goal;
  writeGoals(goals);
  return goals;
}

export async function deleteGoal(index: number): Promise<Goal[]> {
  const goals = readGoals();
  goals.splice(index, 1);
  writeGoals(goals);
  return goals;
}

export function clearGoals() {
  writeGoals([]);
}
