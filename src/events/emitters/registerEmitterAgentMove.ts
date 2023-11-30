import { Codec, NatsConnection, PublishOptions } from "nats";

import { GameData } from "@/models/GameData.js";

const SUBJECT = "agent.emitMoveToSocket";

export type EmitterAgentMovePayload = Pick<
  GameData,
  "gameId" | "gameType" | "gamePositionFen" | "gamePositionPgn"
>;

export const registerEmitterAgentMove =
  (natsClient: NatsConnection, jsonCodec: Codec<Record<string, unknown>>) =>
  (payload: EmitterAgentMovePayload, options?: PublishOptions) =>
    natsClient.publish(SUBJECT, jsonCodec.encode(payload), options);
