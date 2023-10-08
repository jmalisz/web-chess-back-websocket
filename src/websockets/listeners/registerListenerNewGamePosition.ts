import { Chess } from "chess.js";
import { Socket } from "socket.io";

import { validator } from "@/config/validators.js";
import { RequestError } from "@/models/RequestError.js";
import { GameStore } from "@/websockets/stores/createGameStore.js";

const newGamePositionSchema = validator.object({
  gameId: validator.string(),
  from: validator.string(),
  to: validator.string(),
});

type RegisterListenerNewGamePositionProps = {
  socketIo: Socket;
  chess: Chess;
  gameStore: GameStore;
};

export const registerListenerNewGamePosition = ({
  socketIo,
  chess,
  gameStore,
}: RegisterListenerNewGamePositionProps) => {
  socketIo.on("newGamePosition", (data) => {
    const { gameId, from, to } = newGamePositionSchema.parse(data);
    const savedGameData = gameStore.findGame(gameId);

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
    gameStore.saveGame(gameId, {
      ...savedGameData,
      gamePositionPgn: chess.pgn(),
      gamePositionFen,
    });

    socketIo.to(gameId).emit("newGamePosition", { gamePositionFen });
    socketIo.emit("newGamePosition", { gamePositionFen });
  });
};
