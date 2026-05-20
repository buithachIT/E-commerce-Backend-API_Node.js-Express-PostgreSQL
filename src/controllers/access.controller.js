"use strict";

const AccessService = require("../services/access.service");
const { OK, CREATED } = require("../core/success.response");
class AccessController {
  signUp = async (req, res, next) => {
    const serviceResult = await AccessService.SignUp(req.body);
    CREATED.send(res, {
      message: "Register account successfully!",
      metadata: serviceResult,
    });
  };
}
module.exports = new AccessController();
