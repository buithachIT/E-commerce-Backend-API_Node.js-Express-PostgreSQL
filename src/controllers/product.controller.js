"use strict";

const { ProductFactory } = require("../services/product.service");
const { OK } = require("../core/success.response");

class ProductController {
  createProduct = async (req, res, next) => {
    const newProduct = await ProductFactory.createProduct(
      req.body.product_type,
      { ...req.body, product_shop: req.user.userId },
    );
    OK.send(res, {
      message: "Created new product!",
      metadata: newProduct,
    });
  };
  updateProduct = async (req, res, next) => {
    const updatedProduct = await ProductFactory.updateProduct(
      req.body.product_type,
      req.params.product_id,
      {
        ...req.body,
        product_shop: req.user.userId,
      },
    );
    OK.send(res, {
      message: "Updated product success!",
      metadata: updatedProduct,
    });
  };
  getAllDraftsForShop = async (req, res, next) => {
    const { product_shop, limit, skip } = req.query;
    const drafts = await ProductFactory.findAllDraftForShop({
      product_shop: req.user.userId,
    });
    OK.send(res, {
      message: "Found all drafts for shop!",
      metadata: drafts,
    });
  };
  getAllPublishedForShop = async (req, res, next) => {
    const { product_shop, limit, skip } = req.query;
    const published = await ProductFactory.findAllPublishedForShop({
      product_shop: req.user.userId,
    });
    OK.send(res, {
      message: "Found all published for shop!",
      metadata: published,
    });
  };
  publishedProductByShop = async (req, res, next) => {
    const product_id = req.params.id;

    const published = await ProductFactory.publishProductByShop({
      product_shop: req.user.userId,
      product_id,
    });
    OK.send(res, {
      message: "Published!",
      metadata: published,
    });
  };
  unPublishedProductByShop = async (req, res, next) => {
    const product_id = req.params.id;

    const unPublished = await ProductFactory.unPublishProductByShop({
      product_shop: req.user.userId,
      product_id,
    });
    OK.send(res, {
      message: "Unpublished!",
      metadata: unPublished,
    });
  };
  getListSearchProduct = async (req, res, next) => {
    const listProduct = await ProductFactory.getListProducts(req.params);
    OK.send(res, {
      message: "Get list success!",
      metadata: listProduct,
    });
  };
  findAllProduct = async (req, res, next) => {
    const listProduct = await ProductFactory.findAllProducts(req.params);
    OK.send(res, {
      message: "Get list findAllProduct success!",
      metadata: listProduct,
    });
  };
}

module.exports = new ProductController();
