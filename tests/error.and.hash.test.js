"use strict";

const crypto = require("crypto");
const {
  BadRequestError,
  AuthFailureError,
  NotFoundError,
} = require("../src/core/error.response");

describe("error.response", () => {
  test("BadRequestError defaults to 400", () => {
    const err = new BadRequestError("bad");
    expect(err.message).toBe("bad");
    expect(err.status).toBe(400);
  });

  test("AuthFailureError defaults to 401", () => {
    const err = new AuthFailureError();
    expect(err.status).toBe(401);
  });

  test("NotFoundError defaults to 404", () => {
    const err = new NotFoundError("missing");
    expect(err.status).toBe(404);
  });
});

describe("token hashing (auth Phase 1 pattern)", () => {
  const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

  test("same raw token always maps to same hash", () => {
    const raw = "abc123";
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  test("different tokens produce different hashes", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});
