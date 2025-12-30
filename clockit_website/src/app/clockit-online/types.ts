import type { Goal, GoalGroup } from "@/types";

export type GroupView = {
  id: string;
  label: string;
  subtitle: string;
  goals: Goal[];
  kind: "day" | "custom";
  groupId?: string;
  dateKey?: string;
};

export type MoveTargets = GoalGroup[];
