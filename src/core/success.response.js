"use strict";

const StatusCode = {
  OK: 200,
  CREATED: 201,
};
const ReasonStatusCode = {
  CREATED: "Created",
  OK: "Success",
};
class SuccessResponse {
  constructor({
    message,
    statusCode = StatusCode.OK,
    reasonStatusCode = ReasonStatusCode.OK,
    metadata = {},
  }) {
    this.message = !message ? reasonStatusCode : message;
    this.statusCode = statusCode;
    this.metadata = metadata;
  }
  sendData(res, headers = {}) {
    return res.status(this.statusCode).json(this);
  }
  static send(
    res,
    { message, statusCode, reasonStatusCode, metadata },
    headers,
  ) {
    return new this({
      message,
      statusCode,
      reasonStatusCode,
      metadata,
    }).sendData(res, headers);
  }
}

class OK extends SuccessResponse {
  constructor({ message, metadata }) {
    super({ message, metadata });
  }
}

class CREATED extends SuccessResponse {
  constructor({
    options = {},
    message,
    statusCode = StatusCode.CREATED,
    reasonStatusCode = ReasonStatusCode.CREATED,
    metadata,
  }) {
    super({ message, statusCode, reasonStatusCode, metadata });
    this.options = options;
  }
}
module.exports = {
  OK,
  CREATED,
};
