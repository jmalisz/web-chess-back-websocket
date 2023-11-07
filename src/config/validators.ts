import { lowerCase } from "lodash-es";
import z from "zod";

export * as validator from "zod";

const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.path.length === 0) {
    return { message: ctx.defaultError };
  }

  return {
    subcode: "ZOD_ERROR",
    message: `${ctx.defaultError} at "${lowerCase(String(issue.path.at(-1)))}"`,
  };
};

z.setErrorMap(customErrorMap);
