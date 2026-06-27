"use strict";
const { pool } = require("../dbs/init.postgres");
const {
  checkCartIfExits,
  getOrCreateCartId,
} = require("../models/repositories/cart.repo");

class CartService {
  static async getListItemsUserCart(userId) {
    const getListItemUserCartQuery = `
    SELECT c.id as cart_id,
           c.cart_state,
           ci.id as cart_item_id,
           ci.product_id,
           ci.quantity,
           ci.created_at as item_added_at,
           p.product_name,
           p.product_price,
           p.product_thumb
    FROM cart c
    JOIN cart_items ci ON c.id = ci.cart_id
    JOIN products p ON p.id = ci.product_id
    WHERE c.cart_userid = $1 AND c.cart_state = 'active'`;

    const listItemsUserCart = await pool.query(getListItemUserCartQuery, [
      String(userId),
    ]);
    return listItemsUserCart.rows;
  }

  static async addToCart({ userId, product = {} }) {
    const { product_id, quantity } = product;

    const cartId = await getOrCreateCartId(userId);

    const upsertItemQuery = `
    INSERT INTO cart_items (cart_id, product_id, quantity)
    VALUES ($1, $2, $3)
    ON CONFLICT (cart_id, product_id)
    DO UPDATE SET
      quantity = cart_items.quantity + EXCLUDED.quantity,
      updated_at = NOW()
    RETURNING *`;

    const result = await pool.query(upsertItemQuery, [
      cartId,
      product_id,
      quantity,
    ]);

    return result.rows[0];
  }

  static async updateCartQuantity({ cartId, userId }) {}
}

module.exports = CartService;
