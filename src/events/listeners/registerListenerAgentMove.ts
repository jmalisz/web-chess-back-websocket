import { Codec, NatsConnection } from "nats";

import { validator } from "@/config/validators.js";
import { gameDataSchema } from "@/models/GameData.js";

const SUBJECT = "agent.moveCalculated";

export const agentMoveCalculatedPayloadSchema = gameDataSchema.pick({
  gameId: true,
  gamePositionPgn: true,
});

export type ListenerAgentMoveCalculatedPayload = validator.infer<
  typeof agentMoveCalculatedPayloadSchema
>;

type AgentMoveCalculatedCallback = (
  payload: ListenerAgentMoveCalculatedPayload,
) => Promise<void> | void;

export const registerListenerAgentMoveCalculated = (
  natsClient: NatsConnection,
  jsonCodec: Codec<Record<string, unknown>>,
) => {
  const subscription = natsClient.subscribe(SUBJECT);

  return (callback: AgentMoveCalculatedCallback) => {
    // eslint-disable-next-line no-void
    void (async () => {
      for await (const message of subscription) {
        const agentMovePayload = agentMoveCalculatedPayloadSchema.parse(
          jsonCodec.decode(message.data),
        );
        await callback(agentMovePayload);
      }
    })();
  };
};
