"use strict";

const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../../helpers/async-handler");
const { authenticationV2 } = require("../../auth/auth-utils");
const discountController = require("../../controllers/discount.controller");
router.use(authenticationV2);
router.post("", asyncHandler(discountController.generateDiscountCode));
router.get("", asyncHandler(discountController.getAllDiscountCodes));
router.post("/amount", asyncHandler(discountController.getDiscountAmount));
router.get(
  "/products",
  asyncHandler(discountController.getAllDiscountCodesWithProduct),
);

module.exports = router;
