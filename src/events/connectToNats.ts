import { Codec, connect, JSONCodec } from "nats";

import { NATS_URL } from "@/config/env.js";
import { logger } from "@/middlewares/createLogMiddleware.js";

import { registerEmitterAgentCalculateMove } from "./emitters/registerEmitterAgentMove.js";
import { registerListenerAgentMoveCalculated } from "./listeners/registerListenerAgentMove.js";
import { decorateNatsCommunication } from "./middlewares/decorateNatsCommunication.js";

export const jsonCodec: Codec<Record<string, unknown>> = JSONCodec();

export const connectToNats = async () => {
  try {
    const natsClient = await connect({ servers: NATS_URL });
    decorateNatsCommunication(natsClient, jsonCodec);

    // Listeners
    const listenAgentMoveCalculated = registerListenerAgentMoveCalculated(natsClient, jsonCodec);

    // Emitters
    const emitAgentCalculateMove = registerEmitterAgentCalculateMove(natsClient, jsonCodec);

    return {
      // Listeners
      listenAgentMoveCalculated,
      // Emitters
      emitAgentCalculateMove,
    };
  } catch (error) {
    logger.error(error);

    throw error;
  }
};

export type EventHandlers = Awaited<ReturnType<typeof connectToNats>>;
