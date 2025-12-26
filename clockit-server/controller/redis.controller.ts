import type { RedisClientType } from "redis";

export class RedisController {
  private static instance: RedisController | null = null;
  private client: RedisClientType;
  private pending: Map<string, { timer: NodeJS.Timeout; payload: string }> = new Map();
  private ttlSeconds = Number(process.env.REDIS_SESSION_TTL_SECONDS || 60 * 60 * 24); // default 24h

  private constructor(client: RedisClientType) {
    this.client = client;
  }

  static getInstance(client?: RedisClientType) {
    if (!RedisController.instance) {
      if (!client) {
        throw new Error("RedisController not initialized. Redis client instance required.");
      }
      RedisController.instance = new RedisController(client);
    }
    return RedisController.instance;
  }

  async saveUserSessions(userId: string, sessions: unknown[]) {
    const payload = JSON.stringify(sessions);
    await this.client.set(`clockit:sessions:${userId}`, payload, { EX: this.ttlSeconds });
  }

  saveUserSessionsDebounced(userId: string, sessions: unknown[], delayMs = 1500) {
    const payload = JSON.stringify(sessions);
    const existing = this.pending.get(userId);
    if (existing?.timer) {
      clearTimeout(existing.timer);
    }
    const timer = setTimeout(async () => {
      try {
        await this.client.set(`clockit:sessions:${userId}`, payload, { EX: this.ttlSeconds });
      } catch (err) {
        console.error("[clockit-server] Failed to persist to redis", err);
      } finally {
        this.pending.delete(userId);
      }
    }, delayMs);
    this.pending.set(userId, { timer, payload });
  }

  async loadUserSessions<T>(userId: string): Promise<T[] | null> {
    const raw = await this.client.get(`clockit:sessions:${userId}`);
    if (!raw) {return null;}
    try {
      return JSON.parse(raw) as T[];
    } catch {
      return null;
    }
  }

  async loadAllSessions<T>(): Promise<Record<string, T[]>> {
    const result: Record<string, T[]> = {};
    try {
      const iterator = this.client.scanIterator({ MATCH: "clockit:sessions:*", COUNT: 100 });

      // Use SCAN to avoid blocking Redis on large keyspaces
      for await (const key of iterator) {
        const userId = key.toString().split(":").pop() || "anonymous";
        const raw = await this.client.get(key as string);
        if (!raw) {continue;}
        try {
          result[userId] = JSON.parse(raw) as T[];
        } catch {
          // skip malformed entries
        }
      }
    } catch (err) {
      console.warn("[clockit-server] Failed to load all sessions from redis", err);
      return {};
    }
    return result;
  }
  async deleteUserSessions(userId: string) {
    await this.client.del(`clockit:sessions:${userId}`);
  }
}
