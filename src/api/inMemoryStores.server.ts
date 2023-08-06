export type SessionData = boolean;

// Private session token that shouldn't be exposed to other users
export function createSessionStore() {
  // Just check if exists in Map
  const sessionsStore = new Map<string, SessionData>();

  // Clear store every 24h to not overwhelm the server
  // TODO: Not ideal, find better solution. Probably a db.
  setInterval(() => sessionsStore.clear(), 24 * 60 * 60 * 1000);

  function findSession(sessionId: string) {
    return sessionsStore.get(sessionId);
  }
  function saveSession(sessionId: string) {
    return sessionsStore.set(sessionId, true);
  }
  function clearSession(sessionId: string) {
    sessionsStore.delete(sessionId);
  }

  return {
    findSession,
    saveSession,
    clearSession,
  };
}

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

export function createGameStore() {
  const gameStore = new Map<string, GameData>();

  // Clear store every 24h to not overwhelm the server
  // TODO: Not ideal, find better solution. Probably a db.
  setInterval(() => gameStore.clear(), 24 * 60 * 60 * 1000);

  function findGame(gameId: string) {
    return gameStore.get(gameId);
  }
  function saveGame(gameId: string, gameData: GameData) {
    return gameStore.set(gameId, gameData);
  }
  function clearGame(gameId: string) {
    gameStore.delete(gameId);
  }

  return {
    findGame,
    saveGame,
    clearGame,
  };
}
