import { createServer } from "node:http";

import { Chess } from "chess.js";
import type { Express } from "express";
import { Server } from "socket.io";

import { SERVICE_PATH } from "@/config/env.js";
import { logger } from "@/middlewares/createLogMiddleware.js";

import { registerListenerEnterGameRoom } from "./listeners/registerListenerEnterGameRoom.js";
import { registerListenerNewChatMessage } from "./listeners/registerListenerNewChatMessage.js";
import { registerListenerNewGamePosition } from "./listeners/registerListenerNewGamePosition.js";
import { registerListenerSurrender } from "./listeners/registerListenerSurrender.js";
import { registerListenerUndoAnswer } from "./listeners/registerListenerUndoAnswer.js";
import { registerListenerUndoAsk } from "./listeners/registerListenerUndoAsk.js";
import { createSocketSessionMiddleware } from "./middlewares/createSocketSessionMiddleware.js";
import { ChatMessage, createGameStore } from "./stores/createGameStore.js";
import { createSessionStore } from "./stores/createSessionStore.js";
import { decorateSocketIoCommunication } from "./utils/decorateSocketCommunication.js";

declare module "socket.io" {
  interface Socket {
    sessionId: string;
    gameId: string;
    gamePositionPgn: string;
    gamePositionFen: string;
    chatMessages: ChatMessage[];
  }
}

export function createSocketIoServer(app: Express) {
  const sessionStore = createSessionStore();
  const gameStore = createGameStore();
  const httpServer = createServer(app);
  const socketIoServer = new Server(httpServer, {
    path: `${SERVICE_PATH}/socket.io`,
    transports: ["websocket"],
    cors: {
      origin: "*",
    },
  });

  socketIoServer.use(createSocketSessionMiddleware(sessionStore));
  socketIoServer.use(createSocketSessionMiddleware(sessionStore));

  socketIoServer.on("connection", async (socketIo) => {
    decorateSocketIoCommunication(socketIo);

    try {
      const { sessionId } = socketIo;
      await socketIo.join(sessionId);

      const chess = new Chess();

      sessionStore.saveSession(sessionId);
      socketIo.emit("connected", { sessionId });

      registerListenerEnterGameRoom({ socketIo, chess, gameStore });
      registerListenerNewGamePosition({ socketIo, chess, gameStore });
      registerListenerSurrender({ socketIo, chess, gameStore });
      registerListenerUndoAsk(socketIo);
      registerListenerUndoAnswer({ socketIo, chess, gameStore });
      registerListenerNewChatMessage({ socketIo, gameStore });
    } catch (error) {
      logger.error(error);
      socketIo.disconnect(true);
    }
  });

  return { httpServer, socketIoServer };
}
