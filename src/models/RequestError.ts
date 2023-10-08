type Code = "GENERAL" | "WEBSOCKET";

type Subcode = "INTERNAL_SERVER_ERROR" | "NOT_FOUND" | "REQUEST_CONFLICT" | "ZOD_ERROR";

type ErrorObject = {
  message: string;
  fieldPath?: string;
};

type RequestErrorConstructorProps = {
  httpStatus?: number;
  code?: Code;
  subcode?: Subcode;
  errors?: ErrorObject[];
};

export class RequestError extends Error {
  httpStatus: number;

  // Defines module
  code: Code;

  // Defines error type
  subcode: Subcode;

  errors: ErrorObject[];

  constructor({
    httpStatus = 500,
    code = "GENERAL",
    subcode = "INTERNAL_SERVER_ERROR",
    errors = [{ message: "Internal server error" }],
  }: RequestErrorConstructorProps = {}) {
    super("Internal server error");

    this.httpStatus = httpStatus;
    this.code = code;
    this.subcode = subcode;
    this.errors = errors;

    Object.setPrototypeOf(this, RequestError.prototype);
  }
}
