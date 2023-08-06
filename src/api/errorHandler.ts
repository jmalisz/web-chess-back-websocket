/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import type { Socket } from "socket.io";

import { logger } from "@/config/logger";

export const createCallbackErrorWrapper = (socketIo: Socket) => {
  const errorHandler = (error: unknown) => {
     
    logger.error(error);
    socketIo.disconnect(true);
  };

  return (callback: (args: unknown[]) => void) =>
    (...args: unknown[]) => {
      try {
        const ret = Reflect.apply(callback, this, args);
        if (ret && typeof ret?.catch === "function") {
          // async handler
          ret.catch(errorHandler);
        }
      } catch (error) {
         
        errorHandler(error);
      }
    };
};

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
