import { RedisController } from "../controller/redis.controller";
import { SessionState } from "../types";
import { ICache } from "./iCache";

export class RedisCache implements ICache {
    private redisController = RedisController.getInstance();
    async saveUserSessions(userId: string, sessions: Map<string, SessionState>): Promise<void> {
        try {
            return this.redisController.saveUserSessionsDebounced(userId, Array.from(sessions.values()));
        } catch (err) {
            console.warn("[clockit-server] cache saveUserSessions failed, ignoring", err);
            return;
        }
    }
    async getUserSessions(userId: string): Promise<Map<string, SessionState> | undefined> {
        try {
            const sessions = await this.redisController.loadUserSessions<SessionState>(userId);
            if (!sessions) {
                return undefined;
            }
            return new Map(sessions.map((session, index) => [session.sessionId, session]));
        } catch (err) {
            console.warn("[clockit-server] cache getUserSessions failed, returning empty", err);
            return undefined;
        }
    }
    async getAllSessions(): Promise<Map<string, Map<string, SessionState>>> {
        try {
            const allSessions = await this.redisController.loadAllSessions<SessionState>();
            const result = new Map<string, Map<string, SessionState>>();
            for (const [userId, sessions] of Object.entries(allSessions)) {
                result.set(userId, new Map(sessions.map((session) => [session.sessionId, session])));
            }
            return result;
        } catch (err) {
            console.warn("[clockit-server] cache getAllSessions failed, returning empty", err);
            return new Map();
        }
    }
    async deleteUserSessions(userId: string): Promise<void> {
        // RedisController does not have a delete method, so we set an empty array
        try {
            return this.redisController.saveUserSessions(userId, []);
        } catch (err) {
            console.warn("[clockit-server] cache deleteUserSessions failed, ignoring", err);
            return;
        }
    }
}
