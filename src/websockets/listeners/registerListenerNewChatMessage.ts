import { randomUUID } from "node:crypto";

import { Socket } from "socket.io";

import { validator } from "@/config/validators.js";
import { GameStore } from "@/models/GameData.js";
import { RequestError } from "@/models/RequestError.js";

const newChatMessageSchema = validator.object({
  gameId: validator.string(),
  newChatMessage: validator.string(),
});

type RegisterListenerNewChatMessageProps = {
  socketIo: Socket;
  gameStore: GameStore;
};

export const registerListenerNewChatMessage = ({
  socketIo,
  gameStore,
}: RegisterListenerNewChatMessageProps) => {
  const { sessionId } = socketIo;

  socketIo.on("newChatMessage", async (data) => {
    const { gameId, newChatMessage } = newChatMessageSchema.parse(data);
    const savedGameData = await gameStore.findGame(gameId);
    if (!savedGameData) {
      throw new RequestError({
        httpStatus: 404,
        code: "WEBSOCKET",
        subcode: "NOT_FOUND",
        errors: [{ message: "Chat not found" }],
      });
    }

    const savedNewChatMessage = {
      id: randomUUID(),
      fromSessionId: sessionId,
      content: newChatMessage,
    };
    savedGameData.chatMessages.push(savedNewChatMessage);
    await gameStore.saveGame(gameId, savedGameData);

    socketIo.to(gameId).emit("newChatMessage", {
      id: savedNewChatMessage.id,
      isYour: false,
      content: newChatMessage,
    });
    socketIo.emit("newChatMessage", {
      id: savedNewChatMessage.id,
      isYour: true,
      content: newChatMessage,
    });
  });
};
