import { Codec, NatsConnection } from "nats";
import { ZodError } from "zod";

import { logger } from "@/middlewares/createLogMiddleware.js";
import { RequestError } from "@/models/RequestError.js";

const handleError = (error: unknown) => {
  if (error instanceof RequestError) {
    logger.error(RequestError);
  } else if (error instanceof ZodError) {
    const requestError = new RequestError({
      httpStatus: 400,
      code: "NATS",
      subcode: "ZOD_ERROR",
      errors: error.errors,
    });

    logger.error(requestError);
  } else {
    const requestError = new RequestError({
      httpStatus: 500,
      code: "NATS",
      subcode: "INTERNAL_SERVER_ERROR",
      errors: [{ message: error instanceof Error ? error.message : "Internal server error" }],
    });

    logger.error(requestError);
  }
};

const handleLog = (
  type: "Emit" | "Listener",
  natsClient: NatsConnection,
  eventName: string,
  eventData: unknown,
) => {
  logger.info({
    clientId: natsClient.info?.client_id,
    serverId: natsClient.info?.server_id,
    eventName: `NATS [${type === "Emit" ? "Emit" : "Listener"}]: ${eventName}`,
    eventData,
  });
};

export const decorateSubscribe = (
  natsClient: NatsConnection,
  codec: Codec<Record<string, unknown>>,
) => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const natsClientSubscribe = natsClient.subscribe;

  // Decorate subscribe function with log and error wrappers
  // eslint-disable-next-line no-param-reassign
  natsClient.subscribe = (subject, opts) => {
    try {
      const loggingSubscription = natsClientSubscribe.apply(natsClient, [subject, opts]);
      (async () => {
        handleLog("Listener", natsClient, subject, "Start");
        for await (const message of loggingSubscription) {
          handleLog("Listener", natsClient, subject, {
            messageNumber: loggingSubscription.getProcessed(),
            ...codec.decode(message.data),
          });
        }
        handleLog("Listener", natsClient, subject, "End");
      })().catch((error) => {
        handleError(error);
      });

      const subscription = natsClientSubscribe.apply(natsClient, [subject, opts]);
      return subscription;
    } catch (error: unknown) {
      handleError(error);

      throw error;
    }
  };
};

export const decoratePublish = (
  natsClient: NatsConnection,
  codec: Codec<Record<string, unknown>>,
) => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const natsClientPublish = natsClient.publish;

  // Decorate publish function with log and error wrappers
  // eslint-disable-next-line no-param-reassign
  natsClient.publish = (subject, payload, options) => {
    try {
      natsClientPublish.apply(natsClient, [subject, payload, options]);

      const decodedPayload = payload instanceof Uint8Array ? codec.decode(payload) : payload;
      handleLog("Emit", natsClient, subject, decodedPayload);
    } catch (error: unknown) {
      handleError(error);

      throw error;
    }
  };
};

export const decorateNatsCommunication = (
  natsClient: NatsConnection,
  codec: Codec<Record<string, unknown>>,
) => {
  decorateSubscribe(natsClient, codec);
  decoratePublish(natsClient, codec);

  natsClient.closed().then(handleError).catch(handleError);
};
