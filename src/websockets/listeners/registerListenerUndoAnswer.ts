import { Chess } from "chess.js";
import { Socket } from "socket.io";

import { validator } from "@/config/validators.js";
import { RequestError } from "@/models/RequestError.js";
import { GameStore } from "@/websockets/stores/createGameStore.js";

const undoAnswerSchema = validator.object({
  gameId: validator.string(),
  answer: validator.boolean(),
});

type RegisterListenerUndoAnswerProps = {
  socketIo: Socket;
  chess: Chess;
  gameStore: GameStore;
};

export const registerListenerUndoAnswer = ({
  socketIo,
  chess,
  gameStore,
}: RegisterListenerUndoAnswerProps) => {
  socketIo.on("undoAnswer", async (data) => {
    const { gameId, answer } = undoAnswerSchema.parse(data);
    const savedGameData = await gameStore.findGame(gameId);

    if (!savedGameData) {
      throw new RequestError({
        httpStatus: 404,
        code: "WEBSOCKET",
        subcode: "NOT_FOUND",
        errors: [{ message: "Game not found" }],
      });
    }

    if (answer && chess.history().length > 0) {
      chess.loadPgn(savedGameData.gamePositionPgn);
      chess.undo();
      const gamePositionFen = chess.fen();

      await gameStore.saveGame(gameId, {
        ...savedGameData,
        gamePositionPgn: chess.pgn(),
        gamePositionFen,
      });

      socketIo.to(gameId).emit("newGamePosition", { gamePositionFen });
      socketIo.emit("newGamePosition", { gamePositionFen });
    }
  });
};
