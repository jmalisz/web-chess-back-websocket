import dotenv from "dotenv";

dotenv.config();

export const { NODE_ENV, LOG_LEVEL = "info" } = process.env;
