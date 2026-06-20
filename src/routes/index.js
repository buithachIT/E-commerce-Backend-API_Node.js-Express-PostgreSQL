"use strict";

const express = require("express");
const { apiKey, permission } = require("../auth/check-auth");
const router = express.Router();

//Check apiKey
router.use(apiKey);
//Check permission
router.use(permission("0000"));

router.use("/v1/api/product", require("./product"));
router.use("/v1/api/cart", require("./cart"));
router.use("/v1/api/discount", require("./discount"));
router.use("/v1/api", require("./access"));

module.exports = router;
