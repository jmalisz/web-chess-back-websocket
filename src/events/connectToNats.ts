import { Codec, connect, JSONCodec } from "nats";

import { NATS_URL } from "@/config/env.js";
import { logger } from "@/middlewares/createLogMiddleware.js";

import { registerEmitterAgentMove } from "./emitters/registerEmitterAgentMove.js";
import { registerListenerAgentMove } from "./listeners/registerListenerAgentMove.js";
import { decorateNatsCommunication } from "./middlewares/decorateNatsCommunication.js";

export const jsonCodec: Codec<Record<string, unknown>> = JSONCodec();

export const connectToNats = async () => {
  try {
    const natsClient = await connect({ servers: NATS_URL });
    decorateNatsCommunication(natsClient, jsonCodec);

    // Listeners
    const listenAgentMove = registerListenerAgentMove(natsClient, jsonCodec);

    // Emitters
    const emitAgentMove = registerEmitterAgentMove(natsClient, jsonCodec);

    return {
      // Listeners
      listenAgentMove,
      // Emitters
      emitAgentMove,
    };
  } catch (error) {
    logger.error(error);

    throw error;
  }
};

export type EventHandlers = Awaited<ReturnType<typeof connectToNats>>;
