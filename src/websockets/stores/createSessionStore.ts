export type SessionData = boolean;

// Private session token that shouldn't be exposed to other users
export const createSessionStore = () => {
  // Just check if exists in Map
  const sessionsStore = new Map<string, SessionData>();

  // Clear store every 24h to not overwhelm the server
  // TODO: Not ideal, find better solution. Probably a db.
  setInterval(() => sessionsStore.clear(), 24 * 60 * 60 * 1000);

  const findSession = (sessionId: string) => sessionsStore.get(sessionId);
  const saveSession = (sessionId: string) => sessionsStore.set(sessionId, true);
  const clearSession = (sessionId: string) => sessionsStore.delete(sessionId);

  return {
    findSession,
    saveSession,
    clearSession,
  };
};

export type SessionStore = ReturnType<typeof createSessionStore>;
