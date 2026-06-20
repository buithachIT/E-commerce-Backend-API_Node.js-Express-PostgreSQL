"use strict";

const { OK } = require("../core/success.response");
const DiscountService = require("../services/discount.service");

class DiscountController {
  generateDiscountCode = async (req, res, next) => {
    OK.send(res, {
      message: "Created discount code successfully!",
      metadata: await DiscountService.generateDiscountCode({
        ...req.body,
        shopId: req.user.userId,
      }),
    });
  };
  getAllDiscountCodes = async (req, res, next) => {
    OK.send(res, {
      message: "Get all discount codes successfully!",
      metadata: await DiscountService.getAllDiscountCodes(req.user.userId),
    });
  };
  getDiscountAmount = async (req, res, next) => {
    const { code, shopId } = req.query;
    OK.send(res, {
      message: "Get discount amount successfully!",
      metadata: await DiscountService.getDiscountAmount({
        ...req.body,
        userId: req.user.userId,
      }),
    });
  };
  getAllDiscountCodesWithProduct = async (req, res, next) => {
    const { shopId } = req.query;
    OK.send(res, {
      message: "Get all discount codes with product details successfully!",
      metadata: await DiscountService.getAllDiscountCodesWithProducts({
        ...req.query,
        ...req.body,
      }),
    });
  };
}

module.exports = new DiscountController();
