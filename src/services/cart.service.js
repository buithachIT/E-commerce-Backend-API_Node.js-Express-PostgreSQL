"use strict";
const { NotFoundError, BadRequestError } = require("../core/error.response");
const { pool } = require("../dbs/init.postgres");
const {
  getOrCreateCartId,
  updateUserCartQuantity,
  deleteUserCartItem,
  clearUserCart,
} = require("../models/repositories/cart.repo");
const { getProductById } = require("../models/repositories/product.repo");

class CartService {
  static async #validateProductForCart({ product_id, quantity }) {
    if (!product_id) {
      throw new BadRequestError("product_id is required!");
    }
    if (!quantity || quantity <= 0) {
      throw new BadRequestError("quantity must be greater than 0!");
    }

    const foundProduct = await getProductById({ product_id });
    if (!foundProduct) {
      throw new NotFoundError("Product not found!");
    }
    if (!foundProduct.is_published || foundProduct.is_draft) {
      throw new BadRequestError("Product is not available!");
    }
    if (quantity > foundProduct.product_quantity) {
      throw new BadRequestError("Insufficient product quantity!");
    }

    return foundProduct;
  }

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

    const foundProduct = await this.#validateProductForCart({
      product_id,
      quantity,
    });

    const cartId = await getOrCreateCartId(userId);

    const existingItem = await pool.query(
      `SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
      [cartId, product_id],
    );
    const currentQty = existingItem.rows[0]?.quantity || 0;
    if (currentQty + quantity > foundProduct.product_quantity) {
      throw new BadRequestError("Insufficient product quantity!");
    }

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

  static async updateCartQuantity({ product = {}, userId }) {
    const { product_id, quantity, old_quantity } = product;

    if (old_quantity == null) {
      throw new BadRequestError("old_quantity is required!");
    }

    if (quantity === 0) {
      return deleteUserCartItem({ userId, productId: product_id });
    }

    await this.#validateProductForCart({ product_id, quantity });

    return updateUserCartQuantity({ userId, product });
  }

  static async deleteCartItem({ userId, productId }) {
    if (!productId) {
      throw new BadRequestError("productId is required!");
    }

    const deleted = await deleteUserCartItem({ userId, productId });
    if (!deleted) {
      throw new NotFoundError("Cart item not found!");
    }

    return deleted;
  }

  static async clearCart(userId) {
    return clearUserCart(userId);
  }
}

module.exports = CartService;
 