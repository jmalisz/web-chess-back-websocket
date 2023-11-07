// eslint-disable-next-line simple-import-sort/imports, import/order
import { SERVICE_PATH } from "./config/env.js";

import express from "express";
import helmet from "helmet";

import { logger, createLogMiddleware } from "./middlewares/createLogMiddleware.js";
import { RequestError } from "./models/RequestError.js";
import { createErrorMiddleware } from "./middlewares/createErrorMiddleware.js";
import { createSocketIoServer } from "./websockets/createSocketIoServer.js";

const app = express();

app.use(helmet());
app.use(express.json());

app.get(SERVICE_PATH, (_req, res) => {
  res.send("OK");
});

app.all("*", () => {
  throw new RequestError({ httpStatus: 404, code: "GENERAL", subcode: "NOT_FOUND" });
});

app.use(createLogMiddleware());
app.use(createErrorMiddleware());

const { httpServer } = await createSocketIoServer(app);
httpServer.listen(3000, () => {
  logger.info("Express server is running at port 3000");
});

/* eslint-disable unicorn/no-process-exit */
const gracefulShutdown = () => {
  httpServer.close(() => {
    process.exit(1);
  });

  // If a graceful shutdown is not achieved after 1 second, shut down the process completely
  setTimeout(() => {
    // Exit immediately and generate a core dump file
    process.abort();
  }, 1000).unref();
  process.exit(1);
};
/* eslint-enable unicorn/no-process-exit */

process.on("uncaughtException", (err) => {
  logger.fatal(err, "Uncaught exception");
  gracefulShutdown();
});

process.on("unhandledRejection", (err) => {
  logger.fatal(err, "Uncaught rejection");
  gracefulShutdown();
});
