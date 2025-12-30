import { FirestoreService } from './firestore.service';
import { SessionResponseSchema, type ClockitSession, type SessionListItem, type SessionResponse } from '@/types/sessions.types';

const UPLOADS_BASE = 'Uploads';
const SESSIONS_COLLECTION = 'ClockitOnline';

export class SessionsService {
  /**
   * Save Clockit sessions to cloud
   */
  static async saveSessions(uid: string, sessions: ClockitSession[]): Promise<void> {
    const collectionPath = `${UPLOADS_BASE}/${uid}/${SESSIONS_COLLECTION}`;

    for (const session of sessions) {
      const documentPath = `${collectionPath}/${session.id}`;
      await FirestoreService.setDocument(documentPath, session);
    }
  }

  /**
   * List all sessions for a user with pagination
   */
  static async listSessions(
    uid: string,
    limit: number = 10,
    includeFullData: boolean = false
  ): Promise<SessionListItem[] | SessionResponse[]> {
    const collectionPath = `${UPLOADS_BASE}/${uid}/${SESSIONS_COLLECTION}`;

    const sessions = await FirestoreService.queryDocuments<Record<string, unknown>>(
      collectionPath,
      [], // no filters
      'startedAt', // orderByField - order by when session started
      'desc', // orderDirection - most recent first
      limit // limitCount
    );

    if (includeFullData) {
      // Return full session data
      return sessions.map(session => ({
        id: session.id as string,
        label: (session.label as string) || 'Unknown',
        startedAt: (session.startedAt as number) || Date.now(),
        accumulatedMs: (session.accumulatedMs as number) || 0,
        endedAt: session.endedAt as number | undefined,
        running: (session.running as boolean) || false,
        goals: (session.goals as unknown[]) || [],
        groupId: session.groupId as string | undefined,
        groupName: session.groupName as string | undefined,
        comment: session.comment as string | undefined,
        pausedAt: session.pausedAt as number | undefined,
        csv: session.csv as string | undefined,
        createdAt: session.createdAt as string | undefined,
        lastUpdatedAt: session.lastUpdatedAt as string | undefined,
      }));
    }

    // Return just metadata without full data
    return sessions.map(session => ({
      id: session.id as string,
      label: (session.label as string) || 'Unknown',
      startedAt: (session.startedAt as number) || Date.now(),
      accumulatedMs: (session.accumulatedMs as number) || 0,
      endedAt: session.endedAt as number | undefined,
      running: (session.running as boolean) || false,
      groupId: session.groupId as string | undefined,
      groupName: session.groupName as string | undefined,
    }));
  }

  /**
   * Get a specific session by ID
   */
  static async getSession(uid: string, sessionId: string): Promise<SessionResponse> {
    const documentPath = `${UPLOADS_BASE}/${uid}/${SESSIONS_COLLECTION}/${sessionId}`;
    const data = await FirestoreService.getDocument(documentPath);
    const sessionSchema = SessionResponseSchema.safeParse(data);
    if (!sessionSchema.success) {
      throw new Error('Session not found');
    }
    const session = sessionSchema.data;
    return {
      id: sessionId,
      label: (session.label) || 'Unknown',
      startedAt: (session.startedAt as number) || Date.now(),
      accumulatedMs: (session.accumulatedMs as number) || 0,
      endedAt: session.endedAt as number | undefined,
      running: (session.running as boolean) || false,
      goals: (session.goals as unknown[]) || [],
      groupId: session.groupId as string | undefined,
      groupName: session.groupName as string | undefined,
      comment: session.comment as string | undefined,
      pausedAt: session.pausedAt as number | undefined,
      csv: session.csv as string | undefined,
      createdAt: session.createdAt as string | undefined,
      lastUpdatedAt: session.lastUpdatedAt as string | undefined,
    };
  }

  /**
   * Delete a session
   */
  static async deleteSession(uid: string, sessionId: string): Promise<void> {
    const documentPath = `${UPLOADS_BASE}/${uid}/${SESSIONS_COLLECTION}/${sessionId}`;
    await FirestoreService.deleteDocument(documentPath);
  }
}
