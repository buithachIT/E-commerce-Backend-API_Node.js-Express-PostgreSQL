"use strict";

const { ProductFactory } = require("../services/product.service");
const { OK } = require("../core/success.response");

class ProductController {
  createProduct = async (req, res, next) => {
    const newProduct = await ProductFactory.createProduct(
      req.body.product_type,
      req.body,
    );
    OK.send(res, {
      message: "Created new product!",
      metadata: newProduct,
    });
  };
}

module.exports = new ProductController();
