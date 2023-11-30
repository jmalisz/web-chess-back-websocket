import { randomUUID } from "node:crypto";

import { Socket } from "socket.io";

import { validator } from "@/config/validators.js";
import { createSessionStore } from "@/websockets/models/Session.js";

const initialHandshakeSchema = validator.object({
  sessionId: validator.string().nullable(),
});

const setupSession =
  (sessionStore: ReturnType<typeof createSessionStore>) =>
  async (socketIo: Socket, next: (err?: Error) => void) => {
    const { sessionId } = initialHandshakeSchema.parse(socketIo.handshake.auth);

    if (sessionId) {
      const sessionExists = await sessionStore.findSession(sessionId);

      if (sessionExists) {
        // eslint-disable-next-line no-param-reassign
        socketIo.sessionId = sessionId;

        return next();
      }
    }

    // eslint-disable-next-line no-param-reassign
    socketIo.sessionId = randomUUID();

    next();
  };

export const createSocketSessionMiddleware = (
  sessionStore: ReturnType<typeof createSessionStore>,
) => setupSession(sessionStore);
