import { RedisClientType } from "redis";

import { validator } from "@/config/validators.js";

const GAME_STORE_TTL = 24 * 60 * 60;

export const chatMessageSchema = validator.object({
  id: validator.string(),
  fromSessionId: validator.string(),
  content: validator.string(),
});
export type ChatMessage = validator.infer<typeof chatMessageSchema>;

export const gameDataSchema = validator.object({
  firstSessionId: validator.string(),
  secondSessionId: validator.string().optional(),
  gameType: validator.enum(["human", "stockfish", "hybrid", "neural-network"]),
  // Used for saving game history to allow undo between sessions
  gamePositionPgn: validator.string(),
  // Used on client
  gamePositionFen: validator.string(),
  chatMessages: validator.array(chatMessageSchema),
});
export type GameData = validator.infer<typeof gameDataSchema>;

export const createGameStore = (redisClient: RedisClientType) => {
  const findGame = async (gameId: string) =>
    (await redisClient.json.get(`gameId:${gameId}`)) as GameData | null;
  const saveGame = async (gameId: string, gameData: GameData) => {
    await redisClient
      .multi()
      .json.set(`gameId:${gameId}`, "$", gameData)
      .expire(`gameId:${gameId}`, GAME_STORE_TTL)
      .exec();
  };
  const clearGame = async (gameId: string) => {
    await redisClient.del(`gameId:${gameId}`);
  };

  return {
    findGame,
    saveGame,
    clearGame,
  };
};

export type GameStore = ReturnType<typeof createGameStore>;

const SESSION_TTL = 24 * 60 * 60;

export type SessionData = boolean;

// Private session token that shouldn't be exposed to other users
export const createSessionStore = (redisClient: RedisClientType) => {
  const findSession = async (sessionId: string) => redisClient.get(`sessionId:${sessionId}`);
  const saveSession = async (sessionId: string) => {
    await redisClient
      .multi()
      .set(`sessionId:${sessionId}`, "connected")
      .expire(`sessionId:${sessionId}`, SESSION_TTL)
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
