"use strict";

const express = require("express");
const productController = require("../../controllers/product.controller");
const router = express.Router();
const { asyncHandler } = require("../../helpers/async-handler");
const { authenticationV2 } = require("../../auth/auth-utils");

router.get(
  "/search/:keySearch",
  asyncHandler(productController.getListSearchProduct),
);
router.get("/find-all", asyncHandler(productController.findAllProduct));
//authentication
router.use(authenticationV2);

router.post("", asyncHandler(productController.createProduct));
router.patch("/:product_id", asyncHandler(productController.updateProduct));

router.put(
  "/publish/:id",
  asyncHandler(productController.publishedProductByShop),
);
router.put(
  "/un-publish/:id",
  asyncHandler(productController.unPublishedProductByShop),
);

// QUERY //
router.get("/drafts/all", asyncHandler(productController.getAllDraftsForShop));
router.get(
  "/published/all",
  asyncHandler(productController.getAllPublishedForShop),
);

module.exports = router;
