import dotenv from "dotenv";

dotenv.config();

export const { NODE_ENV, SERVICE_PATH = "/", LOG_LEVEL = "info" } = process.env;
