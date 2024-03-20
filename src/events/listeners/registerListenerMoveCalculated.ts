import { Codec, NatsConnection } from "nats";

import { validator } from "@/config/validators.js";
import { gameDataSchema } from "@/models/GameData.js";

const SUBJECT = "agent.moveCalculated";

export const moveCalculatedPayloadSchema = gameDataSchema.pick({
  gameId: true,
  gamePositionPgn: true,
});

export type ListenerMoveCalculatedPayload = validator.infer<typeof moveCalculatedPayloadSchema>;

type MoveCalculatedCallback = (payload: ListenerMoveCalculatedPayload) => Promise<void> | void;

export const registerListenerMoveCalculated =
  (natsClient: NatsConnection, jsonCodec: Codec<Record<string, unknown>>) =>
  (callback: MoveCalculatedCallback) => {
    const subscription = natsClient.subscribe(SUBJECT);

    void (async () => {
      for await (const message of subscription) {
        const agentMovePayload = moveCalculatedPayloadSchema.parse(jsonCodec.decode(message.data));
        await callback(agentMovePayload);
      }
    })();

    return () => subscription.drain();
  };
