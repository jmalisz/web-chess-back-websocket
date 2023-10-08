import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { RequestError } from "@/models/RequestError.js";

import { logger } from "./createLogMiddleware.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleError = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(error);

  if (error instanceof RequestError) {
    return res
      .status(error.httpStatus)
      .send({ code: error.code, subcode: error.subcode, errors: error.errors });
  }

  if (error instanceof ZodError) {
    return res.status(400).send({ code: "GENERAL", subcode: "ZOD_ERROR", errors: error.message });
  }

  res.status(500).send(new RequestError());
};

export const createErrorMiddleware = () => handleError;
