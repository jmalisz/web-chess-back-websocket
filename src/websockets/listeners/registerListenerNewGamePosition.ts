import { Chess } from "chess.js";
import { random } from "lodash-es";
import { Socket } from "socket.io";

import { validator } from "@/config/validators.js";
import { logger } from "@/middlewares/createLogMiddleware.js";
import { RequestError } from "@/models/RequestError.js";
import { GameData, GameStore } from "@/websockets/stores/createGameStore.js";

type HandleAgentMoveProps = {
  socketIo: Socket;
  chess: Chess;
  gameId: string;
  game: GameData;
};

// TODO: Add events for agent microservices
const handleAgentMove = ({ socketIo, chess, game }: HandleAgentMoveProps) => {
  logger.info(game.gameType);

  const potentialMoves = chess.moves();
  const move = potentialMoves[random(potentialMoves.length - 1)];

  if (!move) throw new Error("Illegal move by agent");

  chess.move(move);

  if (chess.isCheckmate()) {
    chess.reset();
    socketIo.emit("defeat");
  } else if (chess.isGameOver()) {
    chess.reset();
    socketIo.emit("draw");
  }
};

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
  socketIo.on("newGamePosition", async (data) => {
    const { gameId, from, to } = newGamePositionSchema.parse(data);
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

    logger.info(chess.history().length);
    if (chess.history().length > 0 && savedGameData.gameType !== "human") {
      handleAgentMove({ socketIo, chess, gameId, game: savedGameData });
    }

    const gamePositionFen = chess.fen();
    await gameStore.saveGame(gameId, {
      ...savedGameData,
      gamePositionPgn: chess.pgn(),
      gamePositionFen,
    });

    socketIo.to(gameId).emit("newGamePosition", { gamePositionFen });
    socketIo.emit("newGamePosition", { gamePositionFen });
  });
};
