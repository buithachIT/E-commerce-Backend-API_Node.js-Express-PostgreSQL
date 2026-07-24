"use strict";

const { BadRequestError, NotFoundError } = require("../core/error.response");
const {
  findActiveCartByIdAndUser,
  getCartItemsByProductIds,
} = require("../models/repositories/cart.repo");
const { getProductsByIds } = require("../models/repositories/product.repo");
const DiscountService = require("./discount.service");

const { acquireLock, releaseLock}  = require("./redis.service");

class CheckoutService {
  /*
    Payload:
    {
      cartId,
      userId,
      shop_order_ids: [
        {
          shopId,
          shop_discounts: [{ code }],
          item_products: [{ productId, quantity }]
        }
      ]
    }
  */

  static async #buildCheckedProducts({
    cartId,
    shopId,
    item_products = [],
  }) {
    if (!item_products.length) {
      throw new BadRequestError("item_products is required!");
    }

    const productIds = item_products.map(
      (item) => item.productId || item.product_id,
    );

    const [products, cartItems] = await Promise.all([
      getProductsByIds(productIds),
      getCartItemsByProductIds({ cartId, productIds }),
    ]);

    const productMap = new Map(products.map((row) => [String(row.id).toLowerCase(), row]));
    const cartItemMap = new Map(
      cartItems.map((row) => [String(row.product_id).toLowerCase(), Number(row.quantity)]),
    );

    const checkedProducts = [];

    for (const item of item_products) {
      const productId = item.productId || item.product_id;
      const quantity = Number(item.quantity);

      if (!productId || !quantity || quantity <= 0) {
        throw new BadRequestError("Invalid product item!");
      }

      const productKey = String(productId).toLowerCase();
      const foundProduct = productMap.get(productKey);
      
      if (!foundProduct) {
        throw new NotFoundError(`Product ${productId} not found!`);
      }
      if (!foundProduct.is_published || foundProduct.is_draft) {
        throw new BadRequestError(
          `Product ${foundProduct.product_name} is not available!`,
        );
      }

      if (Number(foundProduct.product_shop) !== Number(shopId)) {
        throw new BadRequestError(
          `Product ${foundProduct.product_name} does not belong to shop ${shopId}!`,
        );
      }

      if (quantity > Number(foundProduct.product_quantity)) {
        throw new BadRequestError(
          `Insufficient stock for ${foundProduct.product_name}!`,
        );
      }

      const cartQty = cartItemMap.get(productKey);
      if (cartQty === undefined) {
        throw new BadRequestError(
          `Product ${foundProduct.product_name} is not in cart!`,
        );
      }
      if (quantity > cartQty) {
        throw new BadRequestError(
          `Checkout quantity exceeds cart quantity for ${foundProduct.product_name}!`,
        );
      }

      const price = Number(foundProduct.product_price);
      checkedProducts.push({
        productId,
        product_name: foundProduct.product_name,
        product_thumb: foundProduct.product_thumb,
        quantity,
        price,
        totalPrice: price * quantity,
      });
    }

    return checkedProducts;
  }

  static async #applyShopDiscounts({
    shop_discounts = [],
    userId,
    shopId,
    checkedProducts,
  }) {
    let totalDiscount = 0;
    const appliedDiscounts = [];

    for (const discount of shop_discounts) {
      const code = discount.code || discount;
      if (!code) continue;

      const discountResult = await DiscountService.getDiscountAmount({
        code,
        userId,
        shopId,
        products: checkedProducts.map((p) => ({
          product_id: p.productId,
          product_price: p.price,
          quantity: p.quantity,
        })),
      });

      totalDiscount += discountResult.discountAmount;
      appliedDiscounts.push({
        code,
        discountAmount: discountResult.discountAmount,
      });
    }

    return { totalDiscount, appliedDiscounts };
  }

  static async checkoutReviewOrder({ cartId, userId, shop_order_ids = [] }) {
    if (!cartId) {
      throw new BadRequestError("cartId is required!");
    }
    if (!shop_order_ids.length) {
      throw new BadRequestError("shop_order_ids is required!");
    }

    // Đảm bảo findActiveCartByIdAndUser của em check đúng cartId kiểu INT và cart_state = 'active'
    const foundCart = await findActiveCartByIdAndUser({ cartId, userId });
    if (!foundCart) {
      throw new NotFoundError("Cart not found or not active!");
    }

    const shop_order_ids_new = [];
    const checkout_order = {
      totalPrice: 0,
      feeShip: 0,
      totalDiscount: 0,
      totalCheckout: 0,
    };

    for (const shopOrder of shop_order_ids) {
      const { shopId, shop_discounts = [], item_products = [] } = shopOrder;

      if (!shopId) {
        throw new BadRequestError("shopId is required in shop_order_ids!");
      }

      const checkedProducts = await this.#buildCheckedProducts({
        cartId,
        shopId,
        item_products,
      });

      const itemTotal = checkedProducts.reduce(
        (sum, p) => sum + p.totalPrice,
        0,
      );

      const { totalDiscount: rawDiscount, appliedDiscounts } =
        await this.#applyShopDiscounts({
          shop_discounts,
          userId,
          shopId,
          checkedProducts,
        });

      const totalDiscount = Math.min(rawDiscount, itemTotal);
      const shopCheckout = itemTotal - totalDiscount;

      checkout_order.totalPrice += itemTotal;
      checkout_order.totalDiscount += totalDiscount;
      checkout_order.totalCheckout += shopCheckout;

      shop_order_ids_new.push({
        shopId,
        shop_discounts: appliedDiscounts,
        priceRaw: itemTotal,
        priceApplyDiscount: shopCheckout,
        item_products: checkedProducts,
      });
    }

    return {
      checkout_order,
      shop_order_ids: shop_order_ids_new,
    };
  }
  static async orderByUser({ shop_order_ids = [], user_address = {}, user_payment = {}, cartId, userId,  }) {
    const { checkout_order, shop_order_ids: shop_order_ids_new } = await this.checkoutReviewOrder({ cartId, userId, shop_order_ids });

    // check lại một lần nữa xem vượt tồn kho hay không
    for (const shopOrder of shop_order_ids_new) {
      for (const product of shopOrder.item_products) {
        const productId = product.productId;
        const quantity = product.quantity;
        const product = await getProductById(productId);
        if (product.product_quantity < quantity) {
          throw new BadRequestError(`Insufficient stock for product ${product.product_name}!`);
        }
      }
    }
    //get new array of product ids
    const products = shop_order_ids_new.flatMap(order => order.item_products);
    console.log(`[1]::`, products)
    const acquireProduct = [];
    for(let i = 0; i < products.length; i++){
      const {productId, quantity} = products[i];
      const keyLock = await acquireLock(productId, quantity, cartId);
      acquireLock.push(keyLock ? true: false)
      if(keyLock){
        await releaseLock(keyLock);
      } else {
        throw new BadRequestError(`Product is not available!`);
      }
    }
    const newOrder = await order.createOrder
    return newOrder;
  }
}

module.exports = CheckoutService;