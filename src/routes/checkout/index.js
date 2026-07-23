"use strict";

const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../../helpers/async-handler");
const { authenticationV2 } = require("../../auth/auth-utils");
const checkoutController = require("../../controllers/checkout.controller");

router.use(authenticationV2);

router.post("/review", asyncHandler(checkoutController.checkoutReview));

module.exports = router;
