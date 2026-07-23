"use strict";

const { BadRequestError } = require("../core/error.response");
const { pool } = require("../dbs/init.postgres");
const {
  findAllDiscountCodesUnSelect,
  checkDiscountCodeExists,
} = require("../models/repositories/discount.repo");
const { findAllProducts } = require("../models/repositories/product.repo");

const getProductLineTotal = (product) => {
  const qty = product.quantity ?? product.product_quantity ?? 1;
  const price = Number(product.product_price) || 0;
  return price * qty;
};

const getProductId = (product) => product.product_id || product.id;

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

    if (new Date(start_date) > new Date(end_date)) {
      throw new BadRequestError("Start date cannot be after end date");
    }
    if (new Date(end_date) < new Date()) {
      throw new BadRequestError("End date must be in the future");
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
      is_active ?? true,
      shopId,
      min_order_value || 0,
      product_ids || [],
      applies_to || "all",
      name,
      description,
      type,
      value,
      max_value || 0,
      max_uses || 0,
      0,
      max_uses_per_user || 0,
    ];
    const newDiscount = await pool.query(createDiscountQuery, values);
    return newDiscount.rows[0];
  }

  static async getAllDiscountCodes(shopId) {
    const getDiscountsQuery = `
      SELECT * FROM discounts WHERE discount_shopId = $1
    `;
    const discounts = await pool.query(getDiscountsQuery, [Number(shopId)]);
    return discounts.rows;
  }

  static async getAllDiscountCodesWithProducts({
    code,
    shopId,
    limit,
    page,
  }) {
    const foundDiscount = await checkDiscountCodeExists(code, shopId);
    if (!foundDiscount) {
      throw new BadRequestError("Discount code not found for this shop");
    }

    const { discount_apply_to, discount_product_ids } = foundDiscount;

    const productSelect = [
      "product_name",
      "product_price",
      "product_thumb",
    ];

    let products = [];
    if (discount_apply_to === "all") {
      products = await findAllProducts({
        filter: { product_shop: shopId },
        limit: +limit,
        page: +page,
        sort: "ctime",
        select: productSelect,
      });
    } else if (discount_apply_to === "specific") {
      products = await findAllProducts({
        filter: { product_ids: discount_product_ids },
        limit: +limit,
        page: +page,
        sort: "ctime",
        select: productSelect,
      });
    }

    return {
      discount: foundDiscount,
      products,
    };
  }

  static async getAllDiscountCodesByShop({ limit, page, shopId }) {
    return findAllDiscountCodesUnSelect({
      limit: +limit,
      page: +page,
      filter: { discount_shopId: shopId, discount_is_active: true },
      unSelect: ["discount_shopId"],
    });
  }

  static async getDiscountAmount({ code, userId, shopId, products = [] }) {
    if (!code) {
      throw new BadRequestError("Discount code is required!");
    }
    if (!shopId) {
      throw new BadRequestError("shopId is required!");
    }
    if (!products.length) {
      throw new BadRequestError("Products are required!");
    }

    const foundDiscount = await checkDiscountCodeExists(code, shopId);
    if (!foundDiscount) {
      throw new BadRequestError("Discount code not found for this shop");
    }

    const {
      discount_type,
      discount_value,
      discount_max_value,
      discount_min_order_value,
      discount_apply_to,
      discount_product_ids,
      discount_is_active,
      discount_max_uses,
      discount_used_count,
      discount_users_used,
      discount_max_uses_per_user,
      discount_start_date,
      discount_end_date,
    } = foundDiscount;

    if (!discount_is_active) {
      throw new BadRequestError("Discount code is not active");
    }

    const now = new Date();
    if (
      now < new Date(discount_start_date) ||
      now > new Date(discount_end_date)
    ) {
      throw new BadRequestError("Discount code is not valid at this time");
    }

    if (
      discount_max_uses > 0 &&
      discount_used_count >= discount_max_uses
    ) {
      throw new BadRequestError("Discount code has reached maximum uses");
    }

    const usersUsed = discount_users_used || [];
    const userUseCount = usersUsed.filter(
      (id) => String(id) === String(userId),
    ).length;
    if (
      discount_max_uses_per_user > 0 &&
      userUseCount >= discount_max_uses_per_user
    ) {
      throw new BadRequestError("User has already used this discount code");
    }

    const eligibleProductIds = discount_product_ids || [];
    let eligibleProducts = products;

    if (discount_apply_to === "specific") {
      eligibleProducts = products.filter((product) =>
        eligibleProductIds.includes(getProductId(product)),
      );

      if (eligibleProducts.length === 0) {
        throw new BadRequestError(
          "No eligible products found for this discount code",
        );
      }

      const hasIneligibleProduct = products.some(
        (product) => !eligibleProductIds.includes(getProductId(product)),
      );
      if (hasIneligibleProduct) {
        throw new BadRequestError(
          "Some products are not eligible for this discount code",
        );
      }
    }

    const totalOrderValue = eligibleProducts.reduce(
      (acc, product) => acc + getProductLineTotal(product),
      0,
    );

    if (totalOrderValue < Number(discount_min_order_value)) {
      throw new BadRequestError(
        `Order value must be at least ${discount_min_order_value} to use this discount code`,
      );
    }

    let discountAmount = 0;
    if (discount_type === "fixed_amount") {
      discountAmount = Number(discount_value);
    } else if (discount_type === "percentage") {
      discountAmount = (totalOrderValue * Number(discount_value)) / 100;
      if (
        discount_max_value > 0 &&
        discountAmount > Number(discount_max_value)
      ) {
        discountAmount = Number(discount_max_value);
      }
    }

    if (discountAmount > totalOrderValue) {
      discountAmount = totalOrderValue;
    }

    return {
      totalOrderValue,
      discountAmount,
      totalPriceAfterDiscount: totalOrderValue - discountAmount,
    };
  }

  static async deleteDiscountCode({ code, shopId }) {
    const foundDiscount = await checkDiscountCodeExists(code, shopId);
    if (!foundDiscount) {
      throw new BadRequestError("Discount code not found for this shop");
    }

    const deleteDiscountQuery = `
      DELETE FROM discounts WHERE discount_code = $1 AND discount_shopId = $2 RETURNING *
    `;
    const deletedDiscount = await pool.query(deleteDiscountQuery, [code, shopId]);
    return deletedDiscount.rows[0];
  }

  static async cancelDiscountCode({ code, userId, shopId }) {
    const foundDiscount = await checkDiscountCodeExists(code, shopId);
    if (!foundDiscount) {
      throw new BadRequestError("Discount code not found for this shop");
    }

    const usersUsed = foundDiscount.discount_users_used || [];
    if (!usersUsed.map(String).includes(String(userId))) {
      throw new BadRequestError("User has not used this discount code");
    }

    const cancelDiscountQuery = `
      UPDATE discounts
      SET discount_users_used = array_remove(discount_users_used, $1::varchar),
          discount_used_count = GREATEST(discount_used_count - 1, 0)
      WHERE discount_code = $2 AND discount_shopId = $3
      RETURNING *
    `;
    const cancelledDiscount = await pool.query(cancelDiscountQuery, [
      String(userId),
      code,
      shopId,
    ]);
    return cancelledDiscount.rows[0];
  }
}

module.exports = DiscountService;
