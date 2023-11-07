import { createServer } from "node:http";

import { createAdapter } from "@socket.io/redis-adapter";
import { Chess } from "chess.js";
import type { Express } from "express";
import { createClient, RedisClientType } from "redis";
import { Server } from "socket.io";

import { REDIS_DATABASE_URL, SERVICE_PATH } from "@/config/env.js";
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

export async function createSocketIoServer(app: Express) {
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
