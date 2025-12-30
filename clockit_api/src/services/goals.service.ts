import { FirestoreService } from './firestore.service';
import type { Goal, GoalGroup, GoalsResponse, GoalGroupsResponse } from '@/types/goals.types';

const UPLOADS_BASE = 'Uploads';
const GOALS_COLLECTION = 'Goals';
const GOAL_GROUPS_COLLECTION = 'GoalGroups';

export class GoalsService {
  /**
   * Get all goals for a user
   */
  static async getGoals(uid: string): Promise<GoalsResponse> {
    const collectionPath = `${UPLOADS_BASE}/${uid}/${GOALS_COLLECTION}`;
    const docs = await FirestoreService.getAllDocuments<Goal>(collectionPath);

    return { goals: docs };
  }

  /**
   * Get all goal groups for a user
   */
  static async getGoalGroups(uid: string): Promise<GoalGroupsResponse> {
    const collectionPath = `${UPLOADS_BASE}/${uid}/${GOAL_GROUPS_COLLECTION}`;
    const docs = await FirestoreService.getAllDocuments<GoalGroup>(collectionPath);

    return { groups: docs };
  }

  /**
   * Sync goals from client to server
   */
  static async syncGoals(uid: string, goals: Goal[]): Promise<void> {
    const collectionPath = `${UPLOADS_BASE}/${uid}/${GOALS_COLLECTION}`;

    // Use batch write to sync all goals at once
    for (const goal of goals) {
      const documentPath = `${collectionPath}/${goal.id}`;
      await FirestoreService.setDocument(documentPath, goal);
    }
  }

  /**
   * Sync goal groups from client to server
   */
  static async syncGoalGroups(uid: string, groups: GoalGroup[]): Promise<void> {
    const collectionPath = `${UPLOADS_BASE}/${uid}/${GOAL_GROUPS_COLLECTION}`;

    // Use batch write to sync all groups at once
    for (const group of groups) {
      const documentPath = `${collectionPath}/${group.id}`;
      await FirestoreService.setDocument(documentPath, group);
    }
  }

  /**
   * Delete a specific goal
   */
  static async deleteGoal(uid: string, goalId: string): Promise<void> {
    const documentPath = `${UPLOADS_BASE}/${uid}/${GOALS_COLLECTION}/${goalId}`;
    await FirestoreService.deleteDocument(documentPath);
  }

  /**
   * Delete a specific goal group
   */
  static async deleteGoalGroup(uid: string, groupId: string): Promise<void> {
    const documentPath = `${UPLOADS_BASE}/${uid}/${GOAL_GROUPS_COLLECTION}/${groupId}`;
    await FirestoreService.deleteDocument(documentPath);
  }
}
