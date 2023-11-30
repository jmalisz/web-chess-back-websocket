import { isPromise } from "node:util/types";

import { Socket } from "socket.io";
import { ZodError } from "zod";

import { logger } from "@/middlewares/createLogMiddleware.js";
import { RequestError } from "@/models/RequestError.js";

const handleError = (socketIo: Socket, error: unknown) => {
  if (error instanceof RequestError) {
    logger.error(RequestError);
    socketIo.emit("error", RequestError);
  } else if (error instanceof ZodError) {
    const requestError = new RequestError({
      httpStatus: 400,
      code: "WEBSOCKET",
      subcode: "ZOD_ERROR",
      errors: error.errors,
    });

    logger.error(requestError);
    socketIo.emit("error", requestError);
  } else {
    const requestError = new RequestError({
      httpStatus: 500,
      code: "WEBSOCKET",
      subcode: "INTERNAL_SERVER_ERROR",
      errors: [{ message: error instanceof Error ? error.message : "Internal server error" }],
    });

    logger.error(requestError);
    socketIo.emit("error", requestError);
  }

  socketIo.disconnect(true);
};

const handleLog = (
  type: "Emit" | "Listener",
  socketIo: Socket,
  eventName: string,
  eventData: unknown,
) => {
  logger.info({
    socketId: socketIo.id,
    eventName: `WebSocket [${type === "Emit" ? "Emit" : "Listener"}]: ${eventName}`,
    eventData,
  });
};

const decorateEmit = (socketIo: Socket) => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const socketIoEmit = socketIo.emit;

  // Decorate emit function with log and error wrappers
  // eslint-disable-next-line no-param-reassign
  socketIo.emit = (eventName, eventData) => {
    try {
      const emitter = socketIoEmit.apply(socketIo, [eventName, eventData]);

      // Async error handler
      if (isPromise(emitter)) {
        emitter.catch((error: Error) => handleError(socketIo, error));
      }

      handleLog("Emit", socketIo, eventName, eventData);

      return true;
    } catch (error: unknown) {
      // Sync error handler
      handleError(socketIo, error);

      return true;
    }
  };
};

const decorateOn = (socketIo: Socket) => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const socketIoOn = socketIo.on;

  // Decorate listener callback with log and error wrappers
  // eslint-disable-next-line no-param-reassign
  socketIo.on = (eventName, callback) => {
    socketIoOn.apply(socketIo, [
      eventName,
      async (eventData) => {
        try {
          await callback(eventData);

          handleLog("Listener", socketIo, eventName, eventData);

          return socketIo;
        } catch (error: unknown) {
          // Sync error handler
          handleError(socketIo, error);
        }
      },
    ]);

    return socketIo;
  };
};

export const decorateSocketIoCommunication = (socketIo: Socket) => {
  decorateEmit(socketIo);
  decorateOn(socketIo);
};
