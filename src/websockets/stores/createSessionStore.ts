import { RedisClientType } from "redis";

const SESSION_STORE_TTL = 24 * 60 * 60;

// Private session token that shouldn't be exposed to other users
export const createSessionStore = (redisClient: RedisClientType) => {
  const findSession = (sessionId: string) => redisClient.get(`sessionId:${sessionId}`);
  const saveSession = async (sessionId: string) => {
    await redisClient
      .multi()
      .set(`sessionId:${sessionId}`, "connected")
      .expire(`sessionId:${sessionId}`, SESSION_STORE_TTL)
      .exec();
  };
  const clearSession = async (sessionId: string) => {
    await redisClient.del(`sessionId:${sessionId}`);
  };

  return {
    findSession,
    saveSession,
    clearSession,
  };
};

export type SessionStore = ReturnType<typeof createSessionStore>;
