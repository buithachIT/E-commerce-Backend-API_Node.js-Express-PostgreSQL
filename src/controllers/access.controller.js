"use strict";

const AccessService = require("../services/access.service");
const { OK, CREATED } = require("../core/success.response");
class AccessController {
  handlerRefreshToken = async (req, res, next) => {
    const serviceResult = await AccessService.refreshToken({
      refreshToken: req.refreshToken,
      user: req.user,
      keyStore: req.keyStore,
    });
    OK.send(res, {
      message: "Refresh token successfully!",
      metadata: serviceResult,
    });
  };

  logout = async (req, res, next) => {
    const serviceResult = await AccessService.logout({
      keyStore: req.keyStore,
    });
    OK.send(res, {
      message: "Logout successfully!",
      metadata: serviceResult,
    });
  };

  login = async (req, res, next) => {
    const serviceResult = await AccessService.login(req.body);
    OK.send(res, {
      message: "Login successfully!",
      metadata: serviceResult,
    });
  };

  signUp = async (req, res, next) => {
    const serviceResult = await AccessService.signUp(req.body);
    CREATED.send(res, {
      message: "Register account successfully!",
      metadata: serviceResult,
    });
  };
}
module.exports = new AccessController();
