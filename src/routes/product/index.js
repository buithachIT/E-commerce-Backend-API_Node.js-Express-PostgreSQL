"use strict";

const express = require("express");
const productController = require("../../controllers/product.controller");
const router = express.Router();
const { asyncHandler } = require("../../helpers/async-handler");
const { authenticationV2 } = require("../../auth/auth-utils");

//authentication
router.use(authenticationV2);

router.post("", asyncHandler(productController.createProduct));
module.exports = router;
