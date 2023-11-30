import { Codec, NatsConnection } from "nats";

import { validator } from "@/config/validators.js";
import { gameDataSchema } from "@/models/GameData.js";

const SUBJECT = "agent.calculateMove";

export const agentMovePayloadSchema = gameDataSchema.pick({
  gameId: true,
  gamePositionPgn: true,
});

export type ListenerAgentMovePayload = validator.infer<typeof agentMovePayloadSchema>;

type AgentMoveCallback = (payload: ListenerAgentMovePayload) => Promise<void> | void;

export const registerListenerAgentMove = (
  natsClient: NatsConnection,
  jsonCodec: Codec<Record<string, unknown>>,
) => {
  const subscription = natsClient.subscribe(SUBJECT);

  return async (callback: AgentMoveCallback) => {
    for await (const message of subscription) {
      const agentMovePayload = agentMovePayloadSchema.parse(jsonCodec.decode(message.data));
      await callback(agentMovePayload);
    }
  };
};
