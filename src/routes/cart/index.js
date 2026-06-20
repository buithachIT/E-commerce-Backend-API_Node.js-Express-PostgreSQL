"use strict";

const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../../helpers/async-handler");
const { authenticationV2 } = require("../../auth/auth-utils");
const cartController = require("../../controllers/cart.controller");

router.use(authenticationV2);

router.post("/add", asyncHandler(cartController.addToCart));
router.get("", asyncHandler(cartController.getListItemsUserCart));

module.exports = router;
