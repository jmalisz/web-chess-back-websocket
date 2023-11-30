import { Chess } from "chess.js";
import { Socket } from "socket.io";

import { validator } from "@/config/validators.js";
import { GameStore } from "@/models/GameData.js";
import { RequestError } from "@/models/RequestError.js";

const surrenderSchema = validator.object({
  gameId: validator.string(),
});

type RegisterListenerSurrenderProps = {
  socketIo: Socket;
  chess: Chess;
  gameStore: GameStore;
};

export const registerListenerSurrender = ({
  socketIo,
  chess,
  gameStore,
}: RegisterListenerSurrenderProps) => {
  socketIo.on("surrender", async (data) => {
    const { gameId } = surrenderSchema.parse(data);
    const savedGameData = await gameStore.findGame(gameId);
    if (!savedGameData) {
      throw new RequestError({
        httpStatus: 404,
        code: "WEBSOCKET",
        subcode: "NOT_FOUND",
        errors: [{ message: "Game not found" }],
      });
    }

    chess.reset();
    await gameStore.saveGame(gameId, {
      ...savedGameData,
      gamePositionPgn: chess.pgn(),
      gamePositionFen: chess.fen(),
    });

    socketIo.to(gameId).emit("victory");
    socketIo.emit("defeat");

    socketIo.to(gameId).emit("newGamePosition", { gamePositionFen: chess.fen() });
    socketIo.emit("newGamePosition", { gamePositionFen: chess.fen() });
  });
};
