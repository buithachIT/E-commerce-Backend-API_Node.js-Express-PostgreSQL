"use strict";
const { pool } = require("../../dbs/init.postgres");

const getOrCreateCartId = async (userId) => {
  const query = `
    WITH ins AS (
        INSERT INTO cart (cart_userid, cart_state)
        VALUES ($1, 'active')
        ON CONFLICT (cart_userid) DO NOTHING
        RETURNING id
    )
    SELECT id FROM ins
    UNION ALL
    SELECT id FROM cart WHERE cart_userid = $1 AND cart_state = 'active'
    LIMIT 1`;

  const result = await pool.query(query, [String(userId)]);
  return result.rows[0].id;
};

const updateUserCartQuantity = async ({ userId, product = {} }) => {
  const { product_id, quantity, old_quantity } = product;

  const deltaQuantity = quantity - old_quantity;

  const cartId = await getOrCreateCartId(userId);

  const upsertQuery = `
    INSERT INTO cart_items (cart_id, product_id, quantity)
    VALUES ($1, $2, $3)
    ON CONFLICT (cart_id, product_id)
    DO UPDATE SET 
      quantity = cart_items.quantity + EXCLUDED.quantity,
      updated_at = NOW()
    RETURNING *;
  `;

  const result = await pool.query(upsertQuery, [
    cartId,
    product_id,
    deltaQuantity,
  ]);

  if (result.rows[0] && result.rows[0].quantity <= 0) {
    await pool.query(
      `DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2;`,
      [cartId, product_id],
    );
    return { ...result.rows[0], quantity: 0 };
  }

  return result.rows[0];
};

const deleteUserCartItem = async ({ userId, productId }) => {
  const cartId = await getOrCreateCartId(userId);

  const result = await pool.query(
    `DELETE FROM cart_items
     WHERE cart_id = $1 AND product_id = $2
     RETURNING *;`,
    [cartId, productId],
  );

  return result.rows[0] || null;
};

const clearUserCart = async (userId) => {
  const cartId = await getOrCreateCartId(userId);

  const result = await pool.query(
    `DELETE FROM cart_items WHERE cart_id = $1 RETURNING *;`,
    [cartId],
  );

  return result.rows;
};

const findActiveCartByIdAndUser = async ({ cartId, userId }) => {
  const result = await pool.query(
    `SELECT id, cart_userid, cart_state
     FROM cart
     WHERE id = $1 AND cart_userid = $2 AND cart_state = 'active'`,
    [cartId, String(userId)],
  );
  return result.rows[0] || null;
};

const getCartItemsByProductIds = async ({ cartId, productIds }) => {
  if (!productIds.length) return [];

  const result = await pool.query(
    `SELECT product_id, quantity
     FROM cart_items
     WHERE cart_id = $1 AND product_id = ANY($2::uuid[])`,
    [cartId, productIds],
  );
  return result.rows;
};

module.exports = {
  getOrCreateCartId,
  updateUserCartQuantity,
  deleteUserCartItem,
  clearUserCart,
  findActiveCartByIdAndUser,
  getCartItemsByProductIds,
};
