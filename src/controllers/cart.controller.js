const { OK } = require("../core/success.response");
const CartService = require("../services/cart.service");

class CartController {
  getListItemsUserCart = async (req, res, next) => {
    OK.send(res, {
      message: "Get list success!",
      metadata: await CartService.getListItemsUserCart(req.user.userId),
    });
  };
  addToCart = async (req, res, next) => {
    OK.send(res, {
      message: "Added to cart!",
      metadata: await CartService.addToCart({
        userId: req.user.userId,
        ...req.body,
      }),
    });
  };
}
module.exports = new CartController();
