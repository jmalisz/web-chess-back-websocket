import { createServer } from "node:http";

import { createAdapter } from "@socket.io/redis-adapter";
import { Chess } from "chess.js";
import type { Express } from "express";
import { createClient, RedisClientType } from "redis";
import { Server } from "socket.io";

import { REDIS_DATABASE_URL, SERVICE_PATH } from "@/config/env.js";
import { EventHandlers } from "@/events/connectToNats.js";
import { logger } from "@/middlewares/createLogMiddleware.js";
import { ChatMessage, createGameStore } from "@/models/GameData.js";

import { registerEmitterNewGamePosition } from "./emitters/registerEmitterNewGamePosition.js";
import { registerListenerEnterGameRoom } from "./listeners/registerListenerEnterGameRoom.js";
import { registerListenerNewChatMessage } from "./listeners/registerListenerNewChatMessage.js";
import { registerListenerNewGamePosition } from "./listeners/registerListenerNewGamePosition.js";
import { registerListenerSurrender } from "./listeners/registerListenerSurrender.js";
import { registerListenerUndoAnswer } from "./listeners/registerListenerUndoAnswer.js";
import { registerListenerUndoAsk } from "./listeners/registerListenerUndoAsk.js";
import { createSocketSessionMiddleware } from "./middlewares/createSocketSessionMiddleware.js";
import { decorateSocketIoCommunication } from "./middlewares/decorateSocketCommunication.js";
import { createSessionStore } from "./models/Session.js";

declare module "socket.io" {
  interface Socket {
    sessionId: string;
    gameId: string;
    gamePositionPgn: string;
    gamePositionFen: string;
    chatMessages: ChatMessage[];
  }
}

export async function createSocketIoServer(app: Express, eventHandlers: EventHandlers) {
  const httpServer = createServer(app);
  const socketIoServer = new Server(httpServer, {
    path: `${SERVICE_PATH}/socket.io`,
    transports: ["websocket"],
  });

  const pubClient: RedisClientType = createClient({ url: REDIS_DATABASE_URL });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);

  socketIoServer.adapter(createAdapter(pubClient, subClient));

  const sessionStore = createSessionStore(pubClient);
  const gameStore = createGameStore(pubClient);
  socketIoServer.use(createSocketSessionMiddleware(sessionStore));

  socketIoServer.on("connection", async (socketIo) => {
    decorateSocketIoCommunication(socketIo);

    try {
      const { sessionId } = socketIo;
      await socketIo.join(sessionId);

      const chess = new Chess();

      await sessionStore.saveSession(sessionId);
      socketIo.emit("connected", { sessionId });

      // Listeners
      registerListenerEnterGameRoom({ socketIo, chess, gameStore });
      registerListenerNewGamePosition({
        socketIo,
        chess,
        gameStore,
        emitAgentCalculateMove: eventHandlers.emitAgentCalculateMove,
      });
      registerListenerSurrender({ socketIo, chess, gameStore });
      registerListenerUndoAsk({ socketIo, chess, gameStore });
      registerListenerUndoAnswer({ socketIo, chess, gameStore });
      registerListenerNewChatMessage({ socketIo, gameStore });

      // Emitters
      const cleanupEmitterNewGamePosition = registerEmitterNewGamePosition({
        socketIo,
        chess,
        gameStore,
        listenAgentMoveCalculated: eventHandlers.listenAgentMoveCalculated,
      });

      // Cleanup
      socketIo.on("disconnect", () => {
        void cleanupEmitterNewGamePosition();
      });
    } catch (error) {
      logger.error(error);
      socketIo.disconnect(true);
    }
  });

  return { httpServer, socketIoServer };
}
