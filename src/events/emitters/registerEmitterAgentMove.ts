import { Codec, NatsConnection, PublishOptions } from "nats";

import { GameData } from "@/models/GameData.js";

export type EmitterAgentCalculateMovePayload = Pick<
  GameData,
  "gameId" | "gameType" | "gamePositionPgn"
>;

export const registerEmitterAgentCalculateMove =
  (natsClient: NatsConnection, jsonCodec: Codec<Record<string, unknown>>) =>
  ({ gameType, ...payload }: EmitterAgentCalculateMovePayload, options?: PublishOptions) => {
    natsClient.publish(`agent.${gameType}.calculateMove`, jsonCodec.encode(payload), options);
  };
