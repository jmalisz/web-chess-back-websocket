import { Chess } from "chess.js";
import { Socket } from "socket.io";

import { EventHandlers } from "@/events/connectToNats.js";
import { GameStore } from "@/models/GameData.js";
import { RequestError } from "@/models/RequestError.js";

type RegisterEmitterNewGamePositionProps = {
  socketIo: Socket;
  chess: Chess;
  gameStore: GameStore;
  listenAgentMoveCalculated: EventHandlers["listenAgentMoveCalculated"];
};

export const registerEmitterNewGamePosition = ({
  socketIo,
  chess,
  gameStore,
  listenAgentMoveCalculated,
}: RegisterEmitterNewGamePositionProps) =>
  listenAgentMoveCalculated(async (payload) => {
    const { gameId, gamePositionPgn } = payload;

    const savedGameData = await gameStore.findGame(gameId);
    if (!savedGameData) {
      throw new RequestError({
        httpStatus: 404,
        code: "WEBSOCKET",
        subcode: "NOT_FOUND",
        errors: [{ message: "Game not found" }],
      });
    }

    chess.loadPgn(gamePositionPgn);

    if (chess.isCheckmate()) {
      chess.reset();
      socketIo.emit("defeat");
    } else if (chess.isGameOver()) {
      chess.reset();
      socketIo.emit("draw");
    }

    const gamePositionFen = chess.fen();

    await gameStore.saveGame(gameId, {
      ...savedGameData,
      gamePositionFen,
      gamePositionPgn: chess.pgn(),
    });

    socketIo.emit("newGamePosition", { gamePositionFen });
  });
