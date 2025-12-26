import { SessionState } from "../types";
import { ICache } from "./iCache";

export class MemCache implements ICache {
    private sessionsByUser = new Map<string, Map<string, SessionState>>();
    constructor() {
        this.sessionsByUser = new Map<string, Map<string, SessionState>>();
    }
    saveUserSessions(userId: string, sessions: Map<string, SessionState>): Promise<void> {
        this.sessionsByUser.set(userId, sessions);
        return Promise.resolve();
    }
    async getUserSessions(userId: string): Promise<Map<string, SessionState> | undefined> {
        return this.sessionsByUser.get(userId);
    }
    async getAllSessions(): Promise<Map<string, Map<string, SessionState>>> {
        return this.sessionsByUser;
    }
    deleteUserSessions(userId: string): Promise<void> {
        this.sessionsByUser.delete(userId);
        return Promise.resolve();
    }
}