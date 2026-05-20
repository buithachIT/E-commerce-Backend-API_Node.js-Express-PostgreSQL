"use strict";

const express = require("express");
const accessController = require("../../controllers/access.controller");
const { asyncHandler } = require("../../auth/check-auth");
const router = express.Router();

//SignUp
router.post("/shop/signup", asyncHandler(accessController.signUp));

module.exports = router;
