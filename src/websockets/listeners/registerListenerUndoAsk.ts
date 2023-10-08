import { Socket } from "socket.io";

import { validator } from "@/config/validators.js";

const undoAskSchema = validator.object({
  gameId: validator.string(),
});

export const registerListenerUndoAsk = (socketIo: Socket) => {
  socketIo.on("undoAsk", (data) => {
    const { gameId } = undoAskSchema.parse(data);

    socketIo.to(gameId).emit("undoAsk");
  });
};
