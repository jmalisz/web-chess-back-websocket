import dotenv from "dotenv";

dotenv.config();

const {
  NODE_ENV,
  LOG_LEVEL = "info",
  SERVICE_PATH = "/",
  REDIS_DATABASE_URL,
  NATS_URL,
} = process.env;

if (!REDIS_DATABASE_URL) throw new Error("REDIS_DATABASE_URL env is missing");
if (!NATS_URL) throw new Error("NATS_URL env is missing");

export { LOG_LEVEL, NATS_URL, NODE_ENV, REDIS_DATABASE_URL, SERVICE_PATH };
