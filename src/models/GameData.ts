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
  gameId: validator.string(),
  gameType: validator.enum([
    "human",
    "stockfishEngineStrength",
    "stockfishEvaluation",
    "neuralNetwork",
  ]),
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
