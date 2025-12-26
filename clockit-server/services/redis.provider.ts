import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

export const getRedisClient = async (): Promise<RedisClientType | null> => {
  if (client) {return client;}
  const url = process.env.REDIS_URL;
  if (!url) {return null;}
  const username = process.env.REDIS_USERNAME;
  const password = process.env.REDIS_PASSWORD;
  const useTls = process.env.REDIS_TLS === "true";

  console.log("[clockit-server] Connecting to Redis at", url);
  client = createClient({
    url,
    username,
    password,
    socket: useTls ? { tls: true } : undefined,
  });

  client.on("error", (err) => {
    console.error("[clockit-server] Redis client error", err);
  });

  client.on("end", () => {
    console.warn("[clockit-server] Redis connection closed");
  });

  try {
    await client.connect();
    console.log(`[clockit-server] Redis client ID: ${await client.clientId()}`);
    return client;
  } catch (err) {
    console.error("[clockit-server] Failed to connect to Redis", err);
    client = null;
    return null;
  }
};

export const disconnectRedis = async () => {
  if (!client) {return;}
  await client.quit();
  client = null;
};
