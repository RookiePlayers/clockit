import { SessionState } from "../types";

export interface ICache {
    saveUserSessions(userId: string, sessions: Map<string, SessionState>): Promise<void>;
    getUserSessions(userId: string): Promise<Map<string, SessionState> | undefined>;
    getAllSessions(): Promise<Map<string, Map<string, SessionState>>>;
    deleteUserSessions(userId: string): Promise<void>;
}