"use strict";

const { BadRequestError } = require("../core/error.response");
const { pool } = require("../dbs/init.postgres");
const {
  findAllDiscountCodesSelect,
  findAllDiscountCodesUnSelect,
  checkDiscountCodeExists,
} = require("../models/repositories/discount.repo");
const { findAllProducts } = require("../models/repositories/product.repo");

/*
    Discount Services
    1 - Generate discount code [shop/admin]
    2 - Get discount amount [user]
    3 - Get all discount codes [shop/ user]
    4 - Verify discount code [user]
    5 - Delete discount code [shop/admin]
    6 - Cancel discount code [user]
*/
class DiscountService {
  static async generateDiscountCode(payload) {
    const {
      code,
      start_date,
      end_date,
      is_active,
      shopId,
      min_order_value,
      product_ids,
      applies_to,
      name,
      description,
      type,
      value,
      max_value,
      max_uses,
      max_uses_per_user,
    } = payload;
    if (new Date() > new Date(end_date) || new Date() < new Date(start_date)) {
      throw new BadRequestError("Invalid discount code validity period");
    }
    if (new Date(start_date) > new Date(end_date)) {
      throw new BadRequestError("Start date cannot be after end date");
    }
    if (type === "percentage" && (value <= 0 || value > 100)) {
      throw new BadRequestError(
        "Percentage discount value must be between 0 and 100",
      );
    }
    if (type === "fixed_amount" && value <= 0) {
      throw new BadRequestError("Fixed discount value must be positive");
    }
    if (
      applies_to === "specific" &&
      (!product_ids || product_ids.length === 0)
    ) {
      throw new BadRequestError(
        "For specific product discounts, product must be provided",
      );
    }
    const foundDiscount = await pool.query(
      "SELECT * FROM discounts WHERE discount_code = $1 AND discount_shopId = $2",
      [code, shopId],
    );
    if (
      foundDiscount.rows.length > 0 &&
      foundDiscount.rows[0].discount_is_active
    ) {
      throw new BadRequestError("Discount code already exists for this shop");
    }

    const createDiscountQuery = `
      INSERT INTO discounts (
        discount_code,
        discount_start_date,
        discount_end_date,
        discount_is_active,
        discount_shopId,
        discount_min_order_value,
        discount_product_ids,
        discount_apply_to,
        discount_name,
        discount_description,
        discount_type,
        discount_value,
        discount_max_value,
        discount_max_uses,
        discount_used_count,
        discount_max_uses_per_user
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    const values = [
      code,
      start_date,
      end_date,
      is_active,
      shopId,
      min_order_value || 0,
      product_ids || [],
      applies_to || "all",
      name,
      description,
      type,
      value,
      max_value,
      max_uses,
      0, // uses_count starts at 0
      max_uses_per_user || 0,
    ];
    const newDiscount = await pool.query(createDiscountQuery, values);
    return newDiscount.rows[0];
  }

  static async getAllDiscountCodes(shopId) {
    console.log("shopId", shopId);
    const getDiscountsQuery = `
      SELECT * FROM discounts WHERE discount_shopId = $1
    `;
    const discounts = await pool.query(getDiscountsQuery, [Number(shopId)]);
    return discounts.rows;
  }

  static async getAllDiscountCodesWithProducts({
    code,
    shopId,
    userId,
    limit,
    page,
  }) {
    const foundDiscount = await pool.query(
      "SELECT * FROM discounts WHERE discount_code = $1 AND discount_shopId = $2",
      [code, shopId],
    );
    if (foundDiscount.rows.length === 0) {
      throw new BadRequestError("Discount code not found for this shop");
    }

    const { discount_applies_to, discount_product_ids } = foundDiscount.rows[0];

    if (discount_applies_to === "all") {
      const product = findAllProducts({
        filters: { is_published: true, is_draft: false, product_shop: shopId },
        productIds: discount_product_ids,
        limit: +limit,
        page: +page,
        sort: "ctime",
        select: ["id", "product_name", "product_price", "product_thumb"],
      });
      return product;
    }
    if (discount_applies_to === "specific") {
      const product = findAllProducts({
        filters: {
          is_published: true,
          is_draft: false,
          product_ids: discount_product_ids,
        },
        productIds: discount_product_ids,
        limit: +limit,
        page: +page,
        sort: "ctime",
        select: ["id", "product_name", "product_price", "product_thumb"],
      });
      return product;
    }
    const discounts = await pool.query(getDiscountsQuery, [shopId]);
    return discounts.rows;
  }

  static async getAllDiscountCodesByShop({ limit, page, shopId }) {
    const discount = await findAllDiscountCodesUnSelect({
      limit: +limit,
      page: +page,
      filter: { discount_shopId: shopId, discount_is_active: true },
      unSelect: [discount_shopId],
    });
    return discount;
  }

  static async getDiscountAmount({ codeId, userId, shopId, products }) {
    const foundDiscount = await checkDiscountCodeExists(codeId, shopId);
    if (!foundDiscount) {
      throw new BadRequestError("Discount code not found for this shop");
    }
    const {
      discount_type,
      discount_value,
      discount_max_value,
      discount_min_order_value,
      discount_applies_to,
      discount_product_ids,
    } = foundDiscount;
    if (!discount_is_active) {
      throw new BadRequestError("Discount code is not active");
    }
    if (!discount_max_uses || discount_max_uses <= 0) {
      throw new BadRequestError("Discount code has reached maximum uses");
    }
    if (discount_users_used.includes(userId)) {
      throw new BadRequestError("User has already used this discount code");
    }
    if (
      new Date() < new Date(discount_start_date) ||
      new Date() > new Date(discount_end_date)
    ) {
      throw new BadRequestError("Discount code is not valid at this time");
    }
    let totalOrderValue = 0;
    if (discount_min_order_value && discount_min_order_value > 0) {
      totalOrderValue = products.reduce((acc, product) => {
        return acc + product.product_price * product.product_quantity;
      }, 0);
    }
    if (totalOrderValue < discount_min_order_value) {
      throw new BadRequestError(
        `Order value must be at least ${discount_min_order_value} to use this discount code`,
      );
    }
    //fixed_amount hay percentage
    let discountAmount = 0;
    if (discount_type === "fixed_amount") {
      discountAmount = discount_value;
    } else if (discount_type === "percentage") {
      discountAmount = (totalOrderValue * discount_value) / 100;
      if (discount_max_value && discountAmount > discount_max_value) {
        discountAmount = discount_max_value;
      }
    }
    return {
      totalOrderValue,
      discountAmount,
      totalPriceAfterDiscount: totalOrderValue - discountAmount,
    };
  }

  static async deleteDiscountCode({ codeId, shopId }) {
    const foundDiscount = await checkDiscountCodeExists(codeId, shopId);
    if (!foundDiscount) {
      throw new BadRequestError("Discount code not found for this shop");
    }

    //TODO: Check if the discount code has been used by any user before allowing deletion and permission check

    const deleteDiscountQuery = `
      DELETE FROM discounts WHERE id = $1 AND discount_shopId = $2 RETURNING *
    `;
    const deletedDiscount = await pool.query(deleteDiscountQuery, [
      codeId,
      shopId,
    ]);
    return deletedDiscount.rows[0];
  }
  static async cancelDiscountCode({ codeId, userId, shopId }) {
    const foundDiscount = await checkDiscountCodeExists(codeId, shopId);
    if (!foundDiscount) {
      throw new BadRequestError("Discount code not found for this shop");
    }
    const { discount_users_used } = foundDiscount;
    const usersUsed = foundDiscount.discount_users_used || [];
    if (!usersUsed.map(String).includes(String(userId))) {
      throw new BadRequestError("User has not used this discount code");
    }

    const cancelDiscountQuery = `
      UPDATE discounts
      SET discount_users_used = array_remove(discount_users_used, $1),
          discount_used_count = discount_used_count - 1,
          discount_max_uses = discount_max_uses + 1
      WHERE id = $2 AND discount_shopId = $3
      RETURNING *
    `;
    const cancelledDiscount = await pool.query(cancelDiscountQuery, [
      userId,
      codeId,
      shopId,
    ]);
    return cancelledDiscount.rows[0];
  }
}

module.exports = DiscountService;
