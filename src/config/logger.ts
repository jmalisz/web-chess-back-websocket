import { pino } from "pino";

import { LOG_LEVEL } from "@/config/env.js";

export const logger = pino({
  name: "web-chess-back-websocket",
  level: LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
