"use strict";

const { pool } = require("../dbs/init.postgres");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const KeyTokenService = require("./key-token.service");
const { createTokenPair, verifyJWT } = require("../auth/auth-utils");
const { getDataInfo } = require("../utils");
const {
  BadRequestError,
  AuthFailureError,
  ForbiddenError,
} = require("../core/error.response");
const { findByEmail } = require("./user.service");
const { FORBIDDEN } = require("../utils/status-codes.util");

class AccessService {
  static refreshToken = async ({ refreshToken, user, keyStore }) => {
    const { userId, email } = user;
    if (keyStore.refresh_tokens_used.includes(refreshToken)) {
      await KeyTokenService.removeKeyById(keyStore.id);

      throw new ForbiddenError("Something warning happened!! Please re-login!");
    }

    if (keyStore.refresh_token !== refreshToken)
      throw new AuthFailureError("Shop not found!");

    const foundUser = await findByEmail({ email });
    if (!foundUser) throw new AuthFailureError("Shop not registered!");

    //create new token pair
    const tokens = await createTokenPair(
      { userId, email },
      keyStore.public_key,
      keyStore.private_key,
    );
    //update token
    await KeyTokenService.updateRefreshTokenUsed(
      refreshToken,
      tokens.refreshToken,
    );
    return { user, tokens };

    // const foundToken =
    //   await KeyTokenService.findByRefreshTokenUsed(refreshToken);
    // if (foundToken) {
    //   //decode refresh token
    //   const { userId, email } = await verifyJWT(
    //     refreshToken,
    //     foundToken.private_key,
    //   );
    //   console.log({ userId, email });

    //   //xóa tokens
    //   await KeyTokenService.removeKeyById(foundToken.id);
    //   throw new ForbiddenError("Something warning happened!! Please re-login!");
    // }
    // // If not found token, find in dbs
    // const holderToken = await KeyTokenService.findByRefreshToken(refreshToken);
    // if (!holderToken) throw new AuthFailureError("Shop not found!");

    // //verify token
    // const { userId, email } = await verifyJWT(
    //   refreshToken,
    //   holderToken.private_key,
    // );
    // // check userId
    // const foundUser = await findByEmail({ email });
    // if (!foundUser) throw new AuthFailureError("Shop not registered!");

    // //create new token pair
    // const tokens = await createTokenPair(
    //   { userId, email },
    //   holderToken.public_key,
    //   holderToken.private_key,
    // );
    // //update token
    // await KeyTokenService.updateRefreshTokenUsed(
    //   refreshToken,
    //   tokens.refreshToken,
    // );
    // return { user: { userId, email }, tokens };
  };

  static logout = async ({ keyStore }) => {
    const delKey = await KeyTokenService.removeKeyById(keyStore.id);
    return delKey;
  };

  static login = async ({ email, password, refreshToken = null }) => {
    const foundUser = await findByEmail({ email });
    if (!foundUser) {
      throw new BadRequestError("Shop not registered!");
    }

    const match = await bcrypt.compare(password, foundUser.password);
    if (!match) {
      throw new AuthFailureError("Authentication error!");
    }

    const userId = foundUser.id;
    const privateKey = crypto.randomBytes(64).toString("hex");
    const publicKey = crypto.randomBytes(64).toString("hex");
    const tokens = await createTokenPair(
      { userId, email: foundUser.email },
      publicKey,
      privateKey,
    );

    await KeyTokenService.createKeyToken({
      userId,
      publicKey,
      privateKey,
      refresh_token: tokens.refreshToken,
    });

    return {
      account: getDataInfo({
        fields: ["email", "user_name"],
        object: foundUser,
      }),
      tokens,
    };
  };

  static signUp = async ({ email, password }) => {
    if (!email || !password) {
      throw new BadRequestError("Email and password are required!");
    }

    const checkEmailResult = await pool.query(
      "SELECT id FROM accounts WHERE email=$1 LIMIT 1",
      [email],
    );
    if (checkEmailResult.rows.length > 0) {
      throw new BadRequestError("Shop already registered!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user_name = email.split("@")[0];

    const newAccount = await pool.query(
      "INSERT INTO accounts (email, user_name, password) VALUES ($1, $2, $3) RETURNING id, email, user_name",
      [email, user_name, hashedPassword],
    );

    if (!newAccount.rows.length) {
      throw new BadRequestError("Failed to create account!");
    }

    const account = newAccount.rows[0];
    const privateKey = crypto.randomBytes(64).toString("hex");
    const publicKey = crypto.randomBytes(64).toString("hex");

    const tokens = await createTokenPair(
      { userId: account.id, email },
      publicKey,
      privateKey,
    );

    const publicKeyString = await KeyTokenService.createKeyToken({
      userId: account.id,
      publicKey,
      privateKey,
      refresh_token: tokens.refreshToken,
    });

    if (!publicKeyString) {
      throw new BadRequestError("Failed to create key store!");
    }

    return {
      account: getDataInfo({
        fields: ["email", "user_name"],
        object: account,
      }),
      tokens,
    };
  };
}
module.exports = AccessService;
