"use strict";

const AccessService = require("../services/access.service");
const { OK, CREATED } = require("../core/success.response");

class AccessController {
  handlerRefreshToken = async (req, res, next) => {
    OK.send(res, {
      message: "Refresh token successfully!",
      metadata: await AccessService.refreshToken({
        refreshToken: req.refreshToken,
        user: req.user,
        keyStore: req.keyStore,
      }),
    });
  };

  logout = async (req, res, next) => {
    OK.send(res, {
      message: "Logout successfully!",
      metadata: await AccessService.logout({
        keyStore: req.keyStore,
      }),
    });
  };

  login = async (req, res, next) => {
    OK.send(res, {
      message: "Login successfully!",
      metadata: await AccessService.login(req.body),
    });
  };

  signUp = async (req, res, next) => {
    CREATED.send(res, {
      message: "Register account successfully!",
      metadata: await AccessService.signUp(req.body),
    });
  };

  verifyEmail = async (req, res, next) => {
    OK.send(res, {
      message: "Email verified successfully!",
      metadata: await AccessService.verifyEmail(req.body),
    });
  };

  resendVerification = async (req, res, next) => {
    OK.send(res, {
      message: "If applicable, a verification email has been sent.",
      metadata: await AccessService.resendVerification(req.body),
    });
  };

  forgotPassword = async (req, res, next) => {
    OK.send(res, {
      message: "If applicable, a reset email has been sent.",
      metadata: await AccessService.forgotPassword(req.body),
    });
  };

  resetPassword = async (req, res, next) => {
    OK.send(res, {
      message: "Password reset successfully!",
      metadata: await AccessService.resetPassword(req.body),
    });
  };

  getProfile = async (req, res, next) => {
    OK.send(res, {
      message: "Get profile successfully!",
      metadata: await AccessService.getProfile({
        userId: req.user.userId,
      }),
    });
  };
}

module.exports = new AccessController();
