"use strict";

const { pool } = require("../../dbs/init.postgres");

const ALLOWED_DISCOUNT_COLUMNS = [
  "id",
  "discount_name",
  "discount_description",
  "discount_code",
  "discount_type",
  "discount_value",
  "discount_max_value",
  "discount_max_uses",
  "discount_used_count",
  "discount_max_uses_per_user",
  "discount_apply_to",
  "discount_product_ids",
  "discount_shopId",
  "discount_is_active",
  "discount_start_date",
  "discount_end_date",
  "discount_min_order_value",
  "discount_users_used",
  "created_at",
  "updated_at",
];

const findAllDiscountCodesSelect = async ({
  limit = 50,
  page = 1,
  sort = "ctime",
  filter = {},
  select = [],
}) => {
  const skip = (page - 1) * limit;

  let selectColumns = "d.*";
  if (select.length > 0) {
    const safeFields = select.filter((col) =>
      ALLOWED_DISCOUNT_COLUMNS.includes(col),
    );
    if (safeFields.length > 0) {
      selectColumns = safeFields.map((col) => `d.${col}`).join(", ");
    }
  }

  const whereClauses = [];
  const values = [];

  if (filter.discount_shopId) {
    values.push(filter.discount_shopId);
    whereClauses.push(`d.discount_shopId = $${values.length}`);
  }
  if (filter.discount_is_active !== undefined) {
    values.push(filter.discount_is_active);
    whereClauses.push(`d.discount_is_active = $${values.length}`);
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const orderByClause =
    sort === "ctime" ? "d.created_at DESC" : "d.created_at ASC";

  values.push(limit, skip);

  const query = `
    SELECT ${selectColumns}
    FROM discounts d
    ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT $${values.length - 1} OFFSET $${values.length};
  `;
  const result = await pool.query(query, values);
  return result.rows;
};

const findAllDiscountCodesUnSelect = async ({
  limit = 50,
  page = 1,
  sort = "ctime",
  filter = {},
  unSelect = [],
}) => {
  const skip = (page - 1) * limit;

  const selectedFields = ALLOWED_DISCOUNT_COLUMNS.filter(
    (col) => !unSelect.includes(col),
  );

  let selectColumns = "d.*";
  if (selectedFields.length > 0) {
    selectColumns = selectedFields.map((col) => `d.${col}`).join(", ");
  }

  const whereClauses = [];
  const values = [];

  if (filter.discount_shopId) {
    values.push(filter.discount_shopId);
    whereClauses.push(`d.discount_shopId = $${values.length}`);
  }
  if (filter.discount_is_active !== undefined) {
    values.push(filter.discount_is_active);
    whereClauses.push(`d.discount_is_active = $${values.length}`);
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const orderByClause =
    sort === "ctime" ? "d.created_at DESC" : "d.created_at ASC";

  values.push(limit, skip);

  const query = `
    SELECT ${selectColumns}
    FROM discounts d
    ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT $${values.length - 1} OFFSET $${values.length};
  `;
  const result = await pool.query(query, values);
  return result.rows;
};

const checkDiscountCodeExists = async (code, shopId) => {
  const query = `
    SELECT * FROM discounts WHERE discount_code = $1 AND discount_shopId = $2
  `;
  const result = await pool.query(query, [code, shopId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  findAllDiscountCodesSelect,
  findAllDiscountCodesUnSelect,
  checkDiscountCodeExists,
};
