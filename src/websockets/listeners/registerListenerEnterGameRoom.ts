import { Chess } from "chess.js";
import { Socket } from "socket.io";

import { validator } from "@/config/validators.js";
import { GameData, GameStore } from "@/models/GameData.js";
import { pruneSessionData } from "@/websockets/utils/pruneSessionsData.js";

type CreateNewGameProps = {
  socketIo: Socket;
  chess: Chess;
  gameStore: GameStore;
  gameId: string;
  gameType: GameData["gameType"];
};

const createNewGame = async ({
  socketIo,
  chess,
  gameStore,
  gameId,
  gameType,
}: CreateNewGameProps) => {
  const { sessionId } = socketIo;

  const newGameData: GameData = {
    firstSessionId: sessionId,
    gameId,
    gameType,
    gamePositionPgn: chess.pgn(),
    gamePositionFen: chess.fen(),
    chatMessages: [],
  };

  await gameStore.saveGame(gameId, newGameData);
  socketIo.emit("enterGameRoom", pruneSessionData(sessionId, newGameData, "white"));
};

type LoadSavedGameProps = {
  socketIo: Socket;
  chess: Chess;
  savedGameData: GameData;
};

const loadSavedGame = ({ socketIo, chess, savedGameData }: LoadSavedGameProps) => {
  const { sessionId } = socketIo;

  chess.loadPgn(savedGameData.gamePositionPgn);
  socketIo.emit(
    "enterGameRoom",
    pruneSessionData(
      sessionId,
      savedGameData,
      savedGameData.firstSessionId === sessionId ? "white" : "black",
    ),
  );
};

type AddSecondPlayerProps = {
  socketIo: Socket;
  gameStore: GameStore;
  savedGameData: GameData;
  gameId: string;
};

const addSecondPlayer = async ({
  socketIo,
  gameStore,
  savedGameData,
  gameId,
}: AddSecondPlayerProps) => {
  const { sessionId } = socketIo;

  const newSavedGame = { ...savedGameData, secondSessionId: sessionId };
  await gameStore.saveGame(gameId, newSavedGame);

  socketIo.emit("enterGameRoom", pruneSessionData(sessionId, newSavedGame, "black"));
  socketIo
    .to(newSavedGame.firstSessionId)
    .emit("enterGameRoom", pruneSessionData(sessionId, newSavedGame, "white"));
};

const createGameRoomSchema = validator.object({
  gameId: validator.string(),
  gameType: validator.enum([
    "human",
    "stockfishEngineStrength",
    "stockfishEvaluation",
    "neuralNetwork",
  ]),
});

type RegisterListenerEnterGameRoomProps = {
  socketIo: Socket;
  chess: Chess;
  gameStore: GameStore;
};

export const registerListenerEnterGameRoom = ({
  socketIo,
  chess,
  gameStore,
}: RegisterListenerEnterGameRoomProps) => {
  const { sessionId } = socketIo;

  socketIo.on("enterGameRoom", async (data) => {
    const { gameId, gameType } = createGameRoomSchema.parse(data);
    const savedGameData = await gameStore.findGame(gameId);

    await socketIo.join(gameId);

    if (!savedGameData) {
      return createNewGame({ socketIo, chess, gameStore, gameId, gameType });
    }

    if (sessionId === savedGameData.firstSessionId || sessionId === savedGameData.secondSessionId) {
      return loadSavedGame({ socketIo, chess, savedGameData });
    }

    if (savedGameData.gameType === "human" && !savedGameData.secondSessionId) {
      return addSecondPlayer({ socketIo, gameStore, savedGameData, gameId });
    }

    // If sessionId doesn't match disconnect client for trying to access unauthorized data
    socketIo.disconnect();
  });
};
