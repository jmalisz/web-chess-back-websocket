import { GameData } from "@/models/GameData.js";

// Remove private data from GameData
export const pruneSessionData = (
  sessionId: string,
  { gamePositionFen, secondSessionId, chatMessages }: GameData,
  side: "white" | "black",
) => ({
  gamePositionFen,
  side,
  isOpponentMissing: !secondSessionId,
  chatMessages: chatMessages.map(({ id, fromSessionId, content }) => ({
    id,
    isYour: sessionId === fromSessionId,
    content,
  })),
});
