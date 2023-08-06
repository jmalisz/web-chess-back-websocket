// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-param-reassign */

import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

import { Chess } from "chess.js";
import type { Express } from "express";
import { Server } from "socket.io";
import { z } from "zod";

import { createCallbackErrorWrapper } from "./errorHandler";
import type { ChatMessage, GameData } from "./inMemoryStores.server";
import { createGameStore, createSessionStore } from "./inMemoryStores.server";

declare module "socket.io" {
  interface Socket {
    sessionId: string;
    gameId: string;
    gamePositionPgn: string;
    gamePositionFen: string;
    chatMessages: ChatMessage[];
  }
}

const initialHandshakeSchema = z.object({
  sessionId: z.string().nullable(),
});

const createGameRoomSchema = z.object({
  gameId: z.string(),
});

const newGamePositionSchema = z.object({
  gameId: z.string(),
  from: z.string(),
  to: z.string(),
});

const surrenderSchema = z.object({
  gameId: z.string(),
});

const undoAskSchema = z.object({
  gameId: z.string(),
});

const undoAnswerSchema = z.object({
  gameId: z.string(),
  answer: z.boolean(),
});

const newChatMessageSchema = z.object({
  gameId: z.string(),
  newChatMessage: z.string(),
});

export function createSocketIoServer(app: Express) {
  const sessionStore = createSessionStore();
  const gameStore = createGameStore();
  const httpServer = createServer(app);
  const socketIoServer = new Server(httpServer, {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    cors: {
      origin: "*",
    },
  });

  socketIoServer.use((socketIo, next) => {
    const { sessionId } = initialHandshakeSchema.parse(socketIo.handshake.auth);

    if (sessionId) {
      const sessionExists = sessionStore.findSession(sessionId);

      if (sessionExists) {
        socketIo.sessionId = sessionId;

        return next();
      }
    }

    socketIo.sessionId = randomUUID();

    next();
  });

  socketIoServer.on("connection", async (socketIo) => {
    try {
      const { sessionId } = socketIo;
      await socketIo.join(sessionId);

      const chess = new Chess();
      const callbackErrorWrapper = createCallbackErrorWrapper(socketIo);

      sessionStore.saveSession(sessionId);
      socketIo.emit("connected", { sessionId });

      // Remove private data from GameData
      const pruneSessionData = (
        { gamePositionFen, secondSessionId, chatMessages }: GameData,
        side: "white" | "black",
      ) => ({
        gamePositionFen,
        side,
        isOpponentMissing: !secondSessionId,
        chatMessages: chatMessages.map(({ id, fromSessionId, content }) => ({
          id,
          isYour: sessionId === fromSessionId,
          content,
        })),
      });

      // Provides socket logs on client
      if (process.env.NODE_ENV !== "production") {
        socketIo.onAny((event: string) => {
          // eslint-disable-next-line no-console
          console.log(event, sessionId);
        });
        // eslint-disable-next-line no-console
        console.log("Socket created:", sessionId);
      }

      socketIo.on(
        "enterGameRoom",
        callbackErrorWrapper(async (data) => {
          const { gameId } = createGameRoomSchema.parse(data);
          await socketIo.join(gameId);

          const savedGameData = gameStore.findGame(gameId);

          if (savedGameData) {
            if (
              sessionId === savedGameData.firstSessionId ||
              sessionId === savedGameData.secondSessionId
            ) {
              chess.loadPgn(savedGameData.gamePositionPgn);
              socketIo.emit(
                "enterGameRoom",
                pruneSessionData(
                  savedGameData,
                  savedGameData.firstSessionId === sessionId ? "white" : "black",
                ),
              );
              // eslint-disable-next-line unicorn/no-negated-condition
            } else if (!savedGameData.secondSessionId) {
              // Second player is added to the room and game can be started
              savedGameData.secondSessionId = sessionId;
              gameStore.saveGame(gameId, savedGameData);
              socketIo
                .to(savedGameData.firstSessionId)
                .emit("enterGameRoom", pruneSessionData(savedGameData, "white"));
              socketIo.emit("enterGameRoom", pruneSessionData(savedGameData, "black"));
            } else {
              // Disconnect client for trying to access unauthorized data
              socketIo.disconnect();
            }

            return;
          }

          const newGameData: GameData = {
            firstSessionId: sessionId,
            gamePositionPgn: chess.pgn(),
            gamePositionFen: chess.fen(),
            chatMessages: [],
          };

          gameStore.saveGame(gameId, newGameData);
          socketIo.emit("enterGameRoom", pruneSessionData(newGameData, "white"));
        }),
      );
      socketIo.on(
        "newGamePosition",
        callbackErrorWrapper((data) => {
          const { gameId, from, to } = newGamePositionSchema.parse(data);
          const savedGameData = gameStore.findGame(gameId);

          if (!savedGameData) throw new Error("Game not found in newGamePosition");

          // Chess engine needs to be reloaded every move to make sure that neither of players has stale data
          chess.loadPgn(savedGameData.gamePositionPgn);
          // This should error if player has tried to play moves that are impossible from his position
          // Promotion to queen is for simplicity
          chess.move({ from, to, promotion: "q" });

          if (chess.isCheckmate()) {
            chess.reset();
            socketIoServer.to(gameId).except(sessionId).emit("defeat");
            socketIoServer.to(sessionId).emit("victory");
          } else if (chess.isGameOver()) {
            chess.reset();
            socketIoServer.to(gameId).emit("draw");
          }

          const gamePositionFen = chess.fen();
          gameStore.saveGame(gameId, {
            ...savedGameData,
            gamePositionPgn: chess.pgn(),
            gamePositionFen,
          });
          socketIoServer.to(gameId).emit("newGamePosition", { gamePositionFen });
        }),
      );
      socketIo.on(
        "surrender",
        callbackErrorWrapper((data) => {
          const { gameId } = surrenderSchema.parse(data);
          const savedGameData = gameStore.findGame(gameId);

          if (!savedGameData) throw new Error("Game not found in newGamePosition");
          if (!savedGameData.secondSessionId)
            throw new Error("Invalid game state in newGamePosition");

          chess.reset();

          gameStore.saveGame(gameId, {
            ...savedGameData,
            gamePositionPgn: chess.pgn(),
            gamePositionFen: chess.fen(),
          });

          socketIoServer.to(gameId).except(sessionId).emit("victory");
          socketIoServer.to(sessionId).emit("defeat");
          socketIoServer.to(gameId).emit("newGamePosition", { gamePositionFen: chess.fen() });
        }),
      );
      socketIo.on(
        "undoAsk",
        callbackErrorWrapper((data) => {
          const { gameId } = undoAskSchema.parse(data);

          socketIo.to(gameId).emit("undoAsk");
        }),
      );
      socketIo.on(
        "undoAnswer",
        callbackErrorWrapper((data) => {
          const { gameId, answer } = undoAnswerSchema.parse(data);
          const savedGameData = gameStore.findGame(gameId);

          if (!savedGameData) throw new Error("Game not found in undoAnswer");

          if (answer && chess.history().length > 0) {
            chess.loadPgn(savedGameData.gamePositionPgn);
            chess.undo();
            const gamePositionFen = chess.fen();

            gameStore.saveGame(gameId, {
              ...savedGameData,
              gamePositionPgn: chess.pgn(),
              gamePositionFen,
            });
            socketIoServer.to(gameId).emit("newGamePosition", { gamePositionFen });
          }
        }),
      );
      socketIo.on("newChatMessage", (data) => {
        const { gameId, newChatMessage } = newChatMessageSchema.parse(data);
        const savedGameData = gameStore.findGame(gameId);

        if (!savedGameData) throw new Error("Game not found in newChatMessage");

        const savedNewChatMessage = {
          id: randomUUID(),
          fromSessionId: sessionId,
          content: newChatMessage,
        };
        savedGameData.chatMessages.push(savedNewChatMessage);
        gameStore.saveGame(gameId, savedGameData);
        socketIoServer.to(sessionId).emit("newChatMessage", {
          id: savedNewChatMessage.id,
          isYour: true,
          content: newChatMessage,
        });
        socketIoServer.to(gameId).except(sessionId).emit("newChatMessage", {
          id: savedNewChatMessage.id,
          isYour: false,
          content: newChatMessage,
        });
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      socketIo.disconnect(true);
    }
  });

  return { httpServer, socketIoServer };
}
