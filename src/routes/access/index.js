"use strict";

const express = require("express");
const accessController = require("../../controllers/access.controller");
const router = express.Router();
const { asyncHandler } = require("../../helpers/async-handler");
const { authentication, authenticationV2 } = require("../../auth/auth-utils");
//SignUp
router.post("/shop/signup", asyncHandler(accessController.signUp));
router.post("/shop/signin", asyncHandler(accessController.login));

//authentication
router.use(authenticationV2);

router.post("/shop/logout", asyncHandler(accessController.logout));
router.post(
  "/shop/refresh-token",
  asyncHandler(accessController.handlerRefreshToken),
);
module.exports = router;
