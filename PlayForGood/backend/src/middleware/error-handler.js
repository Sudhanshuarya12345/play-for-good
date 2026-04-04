import { serverError } from "../http/responses.js";

export function errorHandler(err, _req, res, _next) {
  const message = err?.message || "Unexpected server error";
  return serverError(res, message);
}
