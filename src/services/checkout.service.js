"use strict";

const { BadRequestError, NotFoundError } = require("../core/error.response");
const { pool } = require("../dbs/init.postgres");
const { runInTransaction } = require("../helpers/async-handler");
const {
  findActiveCartByIdAndUser,
  getCartItemsByProductIds,
  deleteCartItemsByProductIds,
  markCartCompletedIfEmpty,
} = require("../models/repositories/cart.repo");
const { getProductsByIds } = require("../models/repositories/product.repo");
const { deductStock } = require("../models/repositories/inventory.repo");
const {
  createOrder,
  createOrderItems,
} = require("../models/repositories/order.repo");
const {
  incrementDiscountUsage,
} = require("../models/repositories/discount.repo");
const DiscountService = require("./discount.service");

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

    const productMap = new Map(
      products.map((row) => [String(row.id).toLowerCase(), row]),
    );
    const cartItemMap = new Map(
      cartItems.map((row) => [
        String(row.product_id).toLowerCase(),
        Number(row.quantity),
      ]),
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

  static async orderByUser({
    shop_order_ids = [],
    user_address = {},
    user_payment = {},
    cartId,
    userId,
  }) {
    const { checkout_order, shop_order_ids: shopOrders } =
      await this.checkoutReviewOrder({ cartId, userId, shop_order_ids });

    const createdOrders = await runInTransaction(pool, async (client) => {
      const orders = [];
      const orderedProductIds = [];

      for (const shopOrder of shopOrders) {
        for (const item of shopOrder.item_products) {
          await deductStock(client, {
            productId: item.productId,
            quantity: item.quantity,
          });
          orderedProductIds.push(item.productId);
        }

        const orderCheckout = {
          totalPrice: shopOrder.priceRaw,
          totalDiscount: shopOrder.priceRaw - shopOrder.priceApplyDiscount,
          totalCheckout: shopOrder.priceApplyDiscount,
          feeShip: 0,
          shop_discounts: shopOrder.shop_discounts,
        };

        const order = await createOrder(client, {
          userId,
          shopId: shopOrder.shopId,
          cartId,
          orderCheckout,
          orderShipping: user_address,
          orderPayment: user_payment,
          orderStatus: "pending",
          paymentStatus: "unpaid",
        });

        const items = await createOrderItems(
          client,
          order.id,
          shopOrder.item_products,
        );

        for (const discount of shopOrder.shop_discounts || []) {
          if (!discount.code) continue;
          await incrementDiscountUsage(client, {
            code: discount.code,
            shopId: shopOrder.shopId,
            userId,
          });
        }

        orders.push({ ...order, items });
      }

      const uniqueProductIds = [...new Set(orderedProductIds.map(String))];
      await deleteCartItemsByProductIds(client, {
        cartId,
        productIds: uniqueProductIds,
      });
      await markCartCompletedIfEmpty(client, cartId);

      return orders;
    });

    return {
      checkout_order,
      orders: createdOrders,
    };
  }
}

module.exports = CheckoutService;
