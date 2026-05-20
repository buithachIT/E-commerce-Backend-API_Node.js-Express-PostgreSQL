"use strict";

const instancePostgres = require("../dbs/init.postgres");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const KeyTokenService = require("./keytoken.service");
const { createTokenPair } = require("../auth/auth-utils");
const { getDataInfo } = require("../utils");
const { BadRequestError } = require("../core/error.response");

class AccessService {
  static SignUp = async ({ email, password }) => {
    try {
      //Step 1: Check if email already exists
      const pool = instancePostgres.pool;

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
        console.log({ privateKey, publicKey }); //save collection KeyStore

        const publicKeyString = await KeyTokenService.createKeyToken({
          userId: newAccount.rows[0].id,
          publicKey: publicKey,
          privateKey: privateKey,
        });

        if (!publicKeyString) {
          return {
            code: 400,
            message: "publicKeyString error!",
          };
        }

        //create token pair
        const tokens = await createTokenPair(
          { userId: newAccount.rows[0].id, email },
          publicKey,
          privateKey,
        );

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
