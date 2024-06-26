import { Chess } from "chess.js";
import { Socket } from "socket.io";

import { validator } from "@/config/validators.js";
import { EventHandlers } from "@/events/connectToNats.js";
import { GameStore } from "@/models/GameData.js";
import { RequestError } from "@/models/RequestError.js";

const newGamePositionSchema = validator.object({
  elo: validator.number(),
  gameId: validator.string(),
  from: validator.string(),
  to: validator.string(),
});

type RegisterListenerNewGamePositionProps = {
  socketIo: Socket;
  chess: Chess;
  gameStore: GameStore;
  emitAgentCalculateMove: EventHandlers["emitAgentCalculateMove"];
};

export const registerListenerNewGamePosition = ({
  socketIo,
  chess,
  gameStore,
  emitAgentCalculateMove,
}: RegisterListenerNewGamePositionProps) => {
  socketIo.on("newGamePosition", async (data) => {
    const { elo, gameId, from, to } = newGamePositionSchema.parse(data);
    const savedGameData = await gameStore.findGame(gameId);
    if (!savedGameData) {
      throw new RequestError({
        httpStatus: 404,
        code: "WEBSOCKET",
        subcode: "NOT_FOUND",
        errors: [{ message: "Game not found" }],
      });
    }

    // Chess engine needs to be reloaded every move to make sure that neither of players has stale data
    chess.loadPgn(savedGameData.gamePositionPgn);
    // This should error if player has tried to play moves that are impossible from his position
    // Promotion to queen is for simplicity
    chess.move({ from, to, promotion: "q" });

    if (chess.isCheckmate()) {
      chess.reset();
      socketIo.to(gameId).emit("defeat");
      socketIo.emit("victory");
    } else if (chess.isGameOver()) {
      chess.reset();
      socketIo.to(gameId).emit("draw");
      socketIo.emit("draw");
    }

    const gamePositionFen = chess.fen();
    const gamePositionPgn = chess.pgn();

    await gameStore.saveGame(gameId, {
      ...savedGameData,
      elo,
      gamePositionPgn,
      gamePositionFen,
    });

    // Notify agent, to let it make a move
    if (chess.history().length > 0) {
      emitAgentCalculateMove({
        elo,
        gameId,
        gameType: savedGameData.gameType,
        gamePositionPgn,
      });
    }

    socketIo.to(gameId).emit("newGamePosition", { gamePositionFen });
    socketIo.emit("newGamePosition", { gamePositionFen });
  });
};
