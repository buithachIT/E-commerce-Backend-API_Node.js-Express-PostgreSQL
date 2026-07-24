"use strict";

const {
  createOrder,
  createOrderItems,
} = require("../src/models/repositories/order.repo");

describe("order.repo", () => {
  let client;

  beforeEach(() => {
    client = { query: jest.fn() };
  });

  test("createOrder inserts snapshot JSON and defaults status", async () => {
    const row = {
      id: "order-1",
      order_user_id: 24,
      order_shop_id: 24,
      order_status: "pending",
      payment_status: "unpaid",
    };
    client.query.mockResolvedValueOnce({ rows: [row] });

    const result = await createOrder(client, {
      userId: "24",
      shopId: 24,
      cartId: 7,
      orderCheckout: { totalCheckout: 100 },
      orderShipping: { phone: "090" },
      orderPayment: { method: "COD" },
    });

    expect(result).toEqual(row);
    expect(client.query).toHaveBeenCalledTimes(1);
    const [, params] = client.query.mock.calls[0];
    expect(params[0]).toBe(24);
    expect(params[1]).toBe(24);
    expect(params[2]).toBe(7);
    expect(JSON.parse(params[3])).toEqual({ totalCheckout: 100 });
    expect(params[6]).toBe("pending");
    expect(params[7]).toBe("unpaid");
  });

  test("createOrderItems returns [] for empty list", async () => {
    const result = await createOrderItems(client, "order-1", []);
    expect(result).toEqual([]);
    expect(client.query).not.toHaveBeenCalled();
  });

  test("createOrderItems snapshots price and total", async () => {
    client.query.mockResolvedValueOnce({
      rows: [
        {
          id: "item-1",
          product_id: "p1",
          quantity: 2,
          product_price: 50,
          total_price: 100,
        },
      ],
    });

    const result = await createOrderItems(client, "order-1", [
      {
        productId: "p1",
        product_name: "Phone",
        price: 50,
        quantity: 2,
        totalPrice: 100,
      },
    ]);

    expect(result).toHaveLength(1);
    const [, params] = client.query.mock.calls[0];
    expect(params).toEqual(["order-1", "p1", "Phone", 50, 2, 100]);
  });
});
