"use strict";

const JWT = require("jsonwebtoken");
const { asyncHandler } = require("../helpers/async-handler");
const HEADER = require("../constants/header.constant");
const { AuthFailureError, NotFoundError } = require("../core/error.response");
const KeyTokenService = require("../services/key-token.service");

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

const authentication = asyncHandler(async (req, res, next) => {
  /*
    step 1: check user Id missing
    step 2: get accessToken
    step 3: verify Token
    step 4: check user in dbs?
    step 5: check keystore with this userId
    step 6: OK all => return next()
  */
  const userId = req.headers[HEADER.CLIENT_ID];
  if (!userId) throw new AuthFailureError("Invalid request 001!");

  const keyStore = await KeyTokenService.findUserById(userId);
  if (!keyStore) throw new NotFoundError("Not found keyStore");

  const accessToken = req.headers[HEADER.AUTHORIZATION];
  if (!accessToken) throw new AuthFailureError("Invalid request 002!");

  try {
    const decodeUser = JWT.verify(accessToken, keyStore.public_key);
    if (userId !== decodeUser.userId.toString())
      throw new AuthFailureError("Invalid request 003!");
    req.keyStore = keyStore;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AuthFailureError("Token expired!");
    }

    if (error.name === "JsonWebTokenError") {
      throw new AuthFailureError("Invalid token!");
    }

    throw error;
  }
});

const authenticationV2 = asyncHandler(async (req, res, next) => {
  /*
    step 1: check user Id missing
    step 2: get accessToken
    step 3: verify Token
    step 4: check user in dbs?
    step 5: check keystore with this userId
    step 6: OK all => return next()
  */

  //Nhánh 1: Kiểm tra refreshToken trước
  const userId = req.headers[HEADER.CLIENT_ID];
  if (!userId) throw new AuthFailureError("Invalid request 001!");

  const keyStore = await KeyTokenService.findUserById(userId);
  if (!keyStore) throw new NotFoundError("Not found keyStore");

  if (req.headers[HEADER.REFRESH_TOKEN]) {
    try {
      const refreshToken = req.headers[HEADER.REFRESH_TOKEN];

      const decodeUser = JWT.verify(refreshToken, keyStore.private_key);
      if (userId !== decodeUser.userId.toString())
        throw new AuthFailureError("Invalid request 003!");
      req.keyStore = keyStore;
      req.user = decodeUser;
      req.refreshToken = refreshToken;

      return next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new AuthFailureError("Token expired!");
      }

      if (error.name === "JsonWebTokenError") {
        throw new AuthFailureError("Invalid token!!");
      }

      throw error;
    }
  }

  //Nhánh 2: Kiểm tra accessToken
  const accessToken = req.headers[HEADER.AUTHORIZATION];
  if (!accessToken) throw new AuthFailureError("Invalid request 002!");

  try {
    const decodeUser = JWT.verify(accessToken, keyStore.public_key);
    if (userId !== decodeUser.userId.toString())
      throw new AuthFailureError("Invalid request 003!");
    req.user = decodeUser;
    req.keyStore = keyStore;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AuthFailureError("Token expired!");
    }

    if (error.name === "JsonWebTokenError") {
      throw new AuthFailureError("Invalid token!");
    }

    throw error;
  }
});

const verifyJWT = async (token, keySecret) => {
  return await JWT.verify(token, keySecret);
};
module.exports = {
  createTokenPair,
  authentication,
  verifyJWT,
  authenticationV2,
};
