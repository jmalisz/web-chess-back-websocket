import { Chess } from "chess.js";
import { Socket } from "socket.io";

import { validator } from "@/config/validators.js";
import { RequestError } from "@/models/RequestError.js";
import { GameStore } from "@/websockets/stores/createGameStore.js";

const undoAskSchema = validator.object({
  gameId: validator.string(),
});

type RegisterListenerUndoAnswerProps = {
  socketIo: Socket;
  chess: Chess;
  gameStore: GameStore;
};

export const registerListenerUndoAsk = ({
  socketIo,
  chess,
  gameStore,
}: RegisterListenerUndoAnswerProps) => {
  socketIo.on("undoAsk", async (data) => {
    const { gameId } = undoAskSchema.parse(data);
    const savedGameData = await gameStore.findGame(gameId);
    if (!savedGameData) {
      throw new RequestError({
        httpStatus: 404,
        code: "WEBSOCKET",
        subcode: "NOT_FOUND",
        errors: [{ message: "Game not found" }],
      });
    }

    chess.loadPgn(savedGameData.gamePositionPgn);

    if (savedGameData.gameType === "human" && chess.history().length > 0) {
      socketIo.to(gameId).emit("undoAsk");
      return;
    }

    // Always allow valid undo for agent games
    if (chess.history().length > 0) {
      chess.undo();
      const gamePositionFen = chess.fen();

      await gameStore.saveGame(gameId, {
        ...savedGameData,
        gamePositionPgn: chess.pgn(),
        gamePositionFen,
      });

      socketIo.emit("newGamePosition", { gamePositionFen });
    }
  });
};
