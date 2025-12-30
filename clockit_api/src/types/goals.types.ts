export interface Goal {
  id: string;
  title: string;
  description?: string;
  groupId?: string;
  completed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface GoalGroup {
  id: string;
  name: string;
  color?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface SyncGoalsRequest {
  goals: Goal[];
}

export interface SyncGoalGroupsRequest {
  groups: GoalGroup[];
}

export interface GoalsResponse {
  goals: Goal[];
}

export interface GoalGroupsResponse {
  groups: GoalGroup[];
}
