"use strict";

const { OK } = require("../core/success.response");
const CheckoutService = require("../services/checkout.service");

class CheckoutController {
  checkoutReview = async (req, res, next) => {
    OK.send(res, {
      message: "Checkout review success!",
      metadata: await CheckoutService.checkoutReviewOrder({
        ...req.body,
        userId: req.user.userId,
      }),
    });
  };

  orderByUser = async (req, res, next) => {
    OK.send(res, {
      message: "Order created successfully!",
      metadata: await CheckoutService.orderByUser({
        ...req.body,
        userId: req.user.userId,
      }),
    });
  };
}

module.exports = new CheckoutController();
