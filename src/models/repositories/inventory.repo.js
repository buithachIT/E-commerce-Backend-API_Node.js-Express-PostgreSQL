"use strict";

const { runInTransaction } = require("../../helpers/async-handler");
const { pool } = require("../../dbs/init.postgres");
const { BadRequestError, NotFoundError } = require("../../core/error.response");

const insertInventory = async ({
  client,
  inven_product_id,
  inven_shop_id,
  inven_stock,
  inven_location,
}) => {
  const insertInventoryQuery = `
      INSERT INTO inventories (
        inven_product_id,
        inven_shop_id,
        inven_stock,
        inven_location
      ) VALUES ($1, COALESCE($2, 'unKnow'), $3, $4)
      RETURNING *
    `;
  const values = [inven_product_id, inven_shop_id, inven_stock, inven_location];
  const result = await client.query(insertInventoryQuery, values);
  return result.rows[0];
};

/**
 * Deduct stock inside an existing transaction (products + inventories).
 * Uses SELECT ... FOR UPDATE for concurrency safety.
 */
const deductStock = async (client, { productId, quantity }) => {
  const numQuantity = Number(quantity);
  if (!productId || numQuantity <= 0) {
    throw new BadRequestError("Invalid stock deduction request!");
  }

  const productResult = await client.query(
    `SELECT id, product_name, product_quantity
     FROM products
     WHERE id = $1
     FOR UPDATE`,
    [productId],
  );

  const product = productResult.rows[0];
  if (!product) {
    throw new NotFoundError(`Product ${productId} not found!`);
  }
  if (Number(product.product_quantity) < numQuantity) {
    throw new BadRequestError(
      `Insufficient stock for ${product.product_name}!`,
    );
  }

  await client.query(
    `UPDATE products
     SET product_quantity = product_quantity - $1,
         updated_at = NOW()
     WHERE id = $2`,
    [numQuantity, productId],
  );

  const inventoryResult = await client.query(
    `SELECT id, inven_stock
     FROM inventories
     WHERE inven_product_id = $1
     FOR UPDATE`,
    [productId],
  );

  if (inventoryResult.rows.length) {
    const inventory = inventoryResult.rows[0];
    if (Number(inventory.inven_stock) < numQuantity) {
      throw new BadRequestError(
        `Insufficient inventory for ${product.product_name}!`,
      );
    }

    await client.query(
      `UPDATE inventories
       SET inven_stock = inven_stock - $1,
           updated_at = NOW()
       WHERE id = $2`,
      [numQuantity, inventory.id],
    );
  }

  return {
    productId,
    quantity: numQuantity,
    remaining: Number(product.product_quantity) - numQuantity,
  };
};

/**
 * Legacy helper (own transaction). Prefer deductStock(client, ...) in place-order.
 */
const reservationInventory = async ({ productId, quantity, quatity, cartId }) => {
  const qty = quantity ?? quatity;
  return runInTransaction(pool, async (client) => {
    const result = await deductStock(client, { productId, quantity: qty });
    if (cartId) {
      const inv = await client.query(
        `SELECT id FROM inventories WHERE inven_product_id = $1 LIMIT 1`,
        [productId],
      );
      if (inv.rows[0]) {
        await client.query(
          `INSERT INTO inventory_reservations (inventory_id, cart_id, num_stock, created_on)
           VALUES ($1, $2, $3, NOW())`,
          [inv.rows[0].id, cartId, Number(qty)],
        );
      }
    }
    return result;
  });
};

module.exports = {
  insertInventory,
  deductStock,
  reservationInventory,
};
