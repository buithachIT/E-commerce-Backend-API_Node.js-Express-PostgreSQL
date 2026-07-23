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

  updateCartQuantity = async (req, res, next) => {
    OK.send(res, {
      message: "Updated cart quantity!",
      metadata: await CartService.updateCartQuantity({
        userId: req.user.userId,
        ...req.body,
      }),
    });
  };

  deleteCartItem = async (req, res, next) => {
    OK.send(res, {
      message: "Deleted cart item!",
      metadata: await CartService.deleteCartItem({
        userId: req.user.userId,
        productId: req.params.productId || req.body.productId,
      }),
    });
  };

  clearCart = async (req, res, next) => {
    OK.send(res, {
      message: "Cleared cart!",
      metadata: await CartService.clearCart(req.user.userId),
    });
  };
}

module.exports = new CartController();
