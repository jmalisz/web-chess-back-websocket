export type ChatMessage = {
  id: string;
  fromSessionId: string;
  content: string;
};

export type GameData = {
  firstSessionId: string;
  secondSessionId?: string;
  // Used for saving game history to allow undo between sessions
  gamePositionPgn: string;
  // TODO: Investigate if it's truly needed
  // Used on client
  gamePositionFen: string;
  chatMessages: ChatMessage[];
};

export const createGameStore = () => {
  const gameStore = new Map<string, GameData>();

  // Clear store every 24h to not overwhelm the server
  // TODO: Not ideal, find better solution. Probably a db.
  setInterval(() => gameStore.clear(), 24 * 60 * 60 * 1000);

  const findGame = (gameId: string) => gameStore.get(gameId);
  const saveGame = (gameId: string, gameData: GameData) => gameStore.set(gameId, gameData);
  const clearGame = (gameId: string) => gameStore.delete(gameId);

  return {
    findGame,
    saveGame,
    clearGame,
  };
};

export type GameStore = ReturnType<typeof createGameStore>;
