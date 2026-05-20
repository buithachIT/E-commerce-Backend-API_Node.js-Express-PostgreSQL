"use strict";

const JWT = require("jsonwebtoken");

const createTokenPair = async (payload, publicKey, privateKey) => {
  try {
    //accessToken & refreshToken
    const accessToken = await JWT.sign(payload, publicKey, {
      expiresIn: "2 days",
    });

    const refreshToken = await JWT.sign(payload, privateKey, {
      expiresIn: "7 days",
    });

    //verify using public token
    JWT.verify(accessToken, publicKey, (err, decoded) => {
      if (err) {
        console.log(`error verify ::`, err);
      } else {
        console.log(`decoded token::`, decoded);
      }
    });
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("CREATE_TOKEN_PAIR_ERROR:", error.message);
    throw error;
  }
};
module.exports = {
  createTokenPair,
};
