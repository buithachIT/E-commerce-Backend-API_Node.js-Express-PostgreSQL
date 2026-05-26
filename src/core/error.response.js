"use strict";

const {
  ReasonPhrases,
  StatusCodes,
} = require("../utils/http-status-code.util");
const reasonPhraseUtil = require("../utils/reason-phrases.util");

const StatusCode = {
  FORBIDDEN: 403,
  CONFLICT: 409,
};

const ReasonStatusCode = {
  FORBIDDEN: "Bad request error",
  CONFLICT: "Conflict error",
};

class ErrorResponse extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

class ConflictRequestError extends ErrorResponse {
  constructor(
    message = ReasonStatusCode.CONFLICT,
    statusCode = StatusCode.CONFLICT,
  ) {
    super(message, statusCode);
  }
}

class BadRequestError extends ErrorResponse {
  constructor(
    message = ReasonStatusCode.FORBIDDEN,
    statusCode = StatusCode.FORBIDDEN,
  ) {
    super(message, statusCode);
  }
}
class AuthFailureError extends ErrorResponse {
  constructor(
    message = reasonPhraseUtil.UNAUTHORIZED,
    statusCode = StatusCodes.UNAUTHORIZED,
  ) {
    super(message, statusCode);
  }
}
class NotFoundError extends ErrorResponse {
  constructor(
    message = reasonPhraseUtil.NOT_FOUND,
    statusCode = StatusCodes.NOT_FOUND,
  ) {
    super(message, statusCode);
  }
}
class ForbiddenError extends ErrorResponse {
  constructor(
    message = reasonPhraseUtil.FORBIDDEN,
    statusCode = StatusCodes.FORBIDDEN,
  ) {
    super(message, statusCode);
  }
}
module.exports = {
  ConflictRequestError,
  BadRequestError,
  AuthFailureError,
  NotFoundError,
  ForbiddenError,
};
