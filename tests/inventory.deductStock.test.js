"use strict";

jest.mock("../src/dbs/init.postgres", () => ({ pool: {} }));
jest.mock("../src/helpers/async-handler", () => ({
  runInTransaction: jest.fn(),
}));

const {
  deductStock,
} = require("../src/models/repositories/inventory.repo");
const {
  BadRequestError,
  NotFoundError,
} = require("../src/core/error.response");

const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";

describe("deductStock", () => {
  let client;

  beforeEach(() => {
    client = { query: jest.fn() };
  });

  test("rejects invalid quantity", async () => {
    await expect(
      deductStock(client, { productId: PRODUCT_ID, quantity: 0 }),
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(client.query).not.toHaveBeenCalled();
  });

  test("throws NotFoundError when product missing", async () => {
    client.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      deductStock(client, { productId: PRODUCT_ID, quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("throws BadRequestError when product stock insufficient", async () => {
    client.query.mockResolvedValueOnce({
      rows: [
        {
          id: PRODUCT_ID,
          product_name: "Phone",
          product_quantity: 1,
        },
      ],
    });

    await expect(
      deductStock(client, { productId: PRODUCT_ID, quantity: 5 }),
    ).rejects.toThrow(/Insufficient stock/);
  });

  test("deducts products + inventories when both exist", async () => {
    client.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: PRODUCT_ID,
            product_name: "Phone",
            product_quantity: 10,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: "inv-1", inven_stock: 10 }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await deductStock(client, {
      productId: PRODUCT_ID,
      quantity: 3,
    });

    expect(result).toEqual({
      productId: PRODUCT_ID,
      quantity: 3,
      remaining: 7,
    });
    expect(client.query).toHaveBeenCalledTimes(4);
    expect(client.query.mock.calls[0][0]).toMatch(/FOR UPDATE/);
    expect(client.query.mock.calls[1][0]).toMatch(/product_quantity/);
    expect(client.query.mock.calls[1][1]).toEqual([3, PRODUCT_ID]);
  });

  test("skips inventory update when no inventory row", async () => {
    client.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: PRODUCT_ID,
            product_name: "Shirt",
            product_quantity: 4,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await deductStock(client, {
      productId: PRODUCT_ID,
      quantity: 2,
    });

    expect(result.remaining).toBe(2);
    expect(client.query).toHaveBeenCalledTimes(3);
  });
});
