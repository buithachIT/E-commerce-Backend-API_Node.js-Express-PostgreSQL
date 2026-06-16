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
    //step 1: check email dbs
    const foundUser = await findByEmail({ email });
    if (!foundUser) {
      throw new BadRequestError("Shop not registered!");
    }

    //step 2 : match password
    const match = await bcrypt.compare(password, foundUser.password);
    if (!match) {
      throw new AuthFailureError("Authentication error!");
    }

    //step3: generate AT & RF tokens
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
    //step4: get data and return
    return {
      metadata: {
        account: getDataInfo({
          fields: ["email", "user_name"],
          object: foundUser,
        }),
        tokens,
      },
    };
  };
  static signUp = async ({ email, password }) => {
    try {
      //Step 1: Check if email already exists

      const checkEmailQuery = "SELECT * FROM accounts WHERE email=$1 LIMIT 1";

      const checkEmailResult = await pool.query(checkEmailQuery, [email]);

      if (checkEmailResult.rows.length > 0) {
        throw new BadRequestError("Error: Shop already registered!");
      }
      //Step 2: Hash password

      const hashedPassword = await bcrypt.hash(password, 10);
      const user_name = email.split("@")[0];

      //Step 3: Create new user in database

      const createUserQuery =
        "INSERT INTO accounts (email, user_name, password) VALUES ($1, $2, $3) RETURNING id, email, user_name";

      const newAccount = await pool.query(createUserQuery, [
        email,
        user_name,
        hashedPassword,
      ]);

      if (newAccount.rows.length > 0) {
        // const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
        //   modulusLength: 4096,
        //   publicKeyEncoding: {
        //     type: "pkcs1",
        //     format: "pem",
        //   },
        //   privateKeyEncoding: {
        //     type: "pkcs1",
        //     format: "pem",
        //   },
        // });

        const privateKey = crypto.randomBytes(64).toString("hex");
        const publicKey = crypto.randomBytes(64).toString("hex");

        //Public key cryptography standard 1 (PKCS1) là một tiêu chuẩn mã hóa được sử dụng trong lĩnh vực mật mã học để định nghĩa cách thức mã hóa và giải mã dữ liệu bằng cách sử dụng cặp khóa công khai và khóa riêng. PKCS1 được phát triển bởi RSA Laboratories và là một phần của bộ tiêu chuẩn PKCS (Public-Key Cryptography Standards).

        //create token pair
        const tokens = await createTokenPair(
          { userId: newAccount.rows[0].id, email },
          publicKey,
          privateKey,
        );
        const publicKeyString = await KeyTokenService.createKeyToken({
          userId: newAccount.rows[0].id,
          publicKey: publicKey,
          privateKey: privateKey,
          refresh_token: tokens.refreshToken,
        });

        if (!publicKeyString) {
          return {
            code: 400,
            message: "publicKeyString error!",
          };
        }
        console.log(`check tokens: `, tokens);
        return {
          code: 201,
          metadata: {
            account: getDataInfo({
              fields: ["email", "user_name"],
              object: newAccount.rows[0],
            }),
            tokens,
          },
        };
      }

      //Step 4: Return success response
      return {
        code: 201,
        metadata: null,
      };
    } catch (error) {
      return {
        code: 400,
        message: error.message,
        status: "error",
      };
    }
  };
}
module.exports = AccessService;
