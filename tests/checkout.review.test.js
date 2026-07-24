"use strict";

jest.mock("../src/dbs/init.postgres", () => ({ pool: { query: jest.fn() } }));
jest.mock("../src/helpers/async-handler", () => ({
  runInTransaction: jest.fn(async (_pool, fn) => fn({ query: jest.fn() })),
}));
jest.mock("../src/models/repositories/cart.repo", () => ({
  findActiveCartByIdAndUser: jest.fn(),
  getCartItemsByProductIds: jest.fn(),
  deleteCartItemsByProductIds: jest.fn(),
  markCartCompletedIfEmpty: jest.fn(),
}));
jest.mock("../src/models/repositories/product.repo", () => ({
  getProductsByIds: jest.fn(),
}));
jest.mock("../src/models/repositories/inventory.repo", () => ({
  deductStock: jest.fn(),
}));
jest.mock("../src/models/repositories/order.repo", () => ({
  createOrder: jest.fn(),
  createOrderItems: jest.fn(),
}));
jest.mock("../src/models/repositories/discount.repo", () => ({
  incrementDiscountUsage: jest.fn(),
}));
jest.mock("../src/services/discount.service", () => ({
  getDiscountAmount: jest.fn(),
}));

const CheckoutService = require("../src/services/checkout.service");
const {
  findActiveCartByIdAndUser,
  getCartItemsByProductIds,
} = require("../src/models/repositories/cart.repo");
const { getProductsByIds } = require("../src/models/repositories/product.repo");
const DiscountService = require("../src/services/discount.service");
const { BadRequestError, NotFoundError } = require("../src/core/error.response");

const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";

describe("CheckoutService.checkoutReviewOrder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("requires cartId", async () => {
    await expect(
      CheckoutService.checkoutReviewOrder({
        userId: 1,
        shop_order_ids: [{ shopId: 1, item_products: [] }],
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  test("requires shop_order_ids", async () => {
    await expect(
      CheckoutService.checkoutReviewOrder({
        cartId: 1,
        userId: 1,
        shop_order_ids: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  test("throws when cart not found", async () => {
    findActiveCartByIdAndUser.mockResolvedValue(null);

    await expect(
      CheckoutService.checkoutReviewOrder({
        cartId: 1,
        userId: 1,
        shop_order_ids: [{ shopId: 24, item_products: [{ productId: PRODUCT_ID, quantity: 1 }] }],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("builds checkout totals from DB prices", async () => {
    findActiveCartByIdAndUser.mockResolvedValue({ id: 1, cart_state: "active" });
    getProductsByIds.mockResolvedValue([
      {
        id: PRODUCT_ID,
        product_name: "Phone",
        product_thumb: "x.jpg",
        product_price: 100,
        product_quantity: 5,
        product_shop: 24,
        is_published: true,
        is_draft: false,
      },
    ]);
    getCartItemsByProductIds.mockResolvedValue([
      { product_id: PRODUCT_ID, quantity: 2 },
    ]);
    DiscountService.getDiscountAmount.mockResolvedValue({ discountAmount: 20 });

    const result = await CheckoutService.checkoutReviewOrder({
      cartId: 1,
      userId: 24,
      shop_order_ids: [
        {
          shopId: 24,
          shop_discounts: [{ code: "SALE20" }],
          item_products: [{ productId: PRODUCT_ID, quantity: 2 }],
        },
      ],
    });

    expect(result.checkout_order).toEqual({
      totalPrice: 200,
      feeShip: 0,
      totalDiscount: 20,
      totalCheckout: 180,
    });
    expect(result.shop_order_ids).toHaveLength(1);
    expect(result.shop_order_ids[0].item_products[0]).toMatchObject({
      productId: PRODUCT_ID,
      quantity: 2,
      price: 100,
      totalPrice: 200,
    });
  });
});
