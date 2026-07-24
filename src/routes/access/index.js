"use strict";

const express = require("express");
const accessController = require("../../controllers/access.controller");
const router = express.Router();
const { asyncHandler } = require("../../helpers/async-handler");
const { authenticationV2 } = require("../../auth/auth-utils");

// Public auth routes
router.post("/shop/signup", asyncHandler(accessController.signUp));
router.post("/shop/signin", asyncHandler(accessController.login));
router.post("/shop/verify-email", asyncHandler(accessController.verifyEmail));
router.post(
  "/shop/resend-verification",
  asyncHandler(accessController.resendVerification),
);
router.post(
  "/shop/forgot-password",
  asyncHandler(accessController.forgotPassword),
);
router.post("/shop/reset-password", asyncHandler(accessController.resetPassword));

// Protected
router.use(authenticationV2);
router.get("/shop/me", asyncHandler(accessController.getProfile));
router.post("/shop/logout", asyncHandler(accessController.logout));
router.post(
  "/shop/refresh-token",
  asyncHandler(accessController.handlerRefreshToken),
);

module.exports = router;
