"use strict";

const { BadRequestError } = require("../../core/error.response");
const instancePostgres = require("../../dbs/init.postgres");
const { BAD_REQUEST } = require("../../utils/status-codes.util");
const pool = instancePostgres.pool || instancePostgres;
const slugify = require("slugify");
const ALLOWED_PRODUCT_COLUMNS = new Set([
  "product_name",
  "product_thumb",
  "product_description",
  "product_price",
  "product_slug",
  "product_quantity",
  "product_type",
  "product_shop",
  "is_draft",
  "is_published",
  "product_ratings_average",
]);
const ALLOWED_ELECTRONICS_COLUMNS = new Set(["manufacturer", "model", "color"]);
const ALLOWED_CLOTHING_COLUMNS = new Set(["brand", "size", "material"]);

const findAllPublishedProductByShop = async ({ query, limit, skip }) => {
  return await queryProduct({ query, limit, skip });
};

const findAllDraftProductByShop = async ({ query, limit, skip }) => {
  return await queryProduct({ query, limit, skip });
};
const updateProductRepo = async ({ productId, payload, client }) => {
  const updateData = { ...payload };

  if (updateData.product_name) {
    updateData.product_slug = slugify(updateData.product_name, { lower: true });
  }

  const keys = Object.keys(updateData).filter(
    (key) =>
      key !== "product_type" &&
      ALLOWED_PRODUCT_COLUMNS.has(key) &&
      updateData[key] !== undefined,
  );

  if (keys.length === 0) return null;

  const setClause = keys
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", ");
  const values = keys.map((key) => updateData[key]);

  values.push(productId);
  const idPlaceholder = `$${values.length}`;

  const querySql = `
    UPDATE products 
    SET ${setClause}, updated_at = NOW()
    WHERE id = ${idPlaceholder}
    RETURNING *;
  `;

  const result = await client.query(querySql, values);
  return result.rows[0];
};

const updateElectronicsRepo = async ({ productId, payload, client }) => {
  const keys = Object.keys(payload).filter(
    (key) => ALLOWED_ELECTRONICS_COLUMNS.has(key) && payload[key] !== undefined,
  );

  if (keys.length === 0) return null;

  const setClause = keys
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", ");
  const values = keys.map((key) => payload[key]);

  values.push(productId);
  const idPlaceholder = `$${values.length}`;

  const querySql = `
    UPDATE electronics_products 
    SET ${setClause}
    WHERE id = ${idPlaceholder}
    RETURNING *;
  `;

  const result = await client.query(querySql, values);
  return result.rows[0];
};

const updateClothingRepo = async ({ productId, payload, client }) => {
  const keys = Object.keys(payload).filter(
    (key) => ALLOWED_CLOTHING_COLUMNS.has(key) && payload[key] !== undefined,
  );

  if (keys.length === 0) return null;

  const setClause = keys
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", ");
  const values = keys.map((key) => payload[key]);

  values.push(productId);
  const idPlaceholder = `$${values.length}`;

  const querySql = `
    UPDATE clothing_products 
    SET ${setClause}
    WHERE id = ${idPlaceholder}
    RETURNING *;
  `;

  const result = await client.query(querySql, values);
  return result.rows[0];
};
const findAllProducts = async ({
  limit = 50,
  sort = "ctime",
  page = 1,
  filter = {},
  select = [],
}) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  let selectColumns = "p.*";
  if (select.length > 0) {
    const safeFields = select
      .filter((col) => ALLOWED_PRODUCT_COLUMNS.has(col))
      .map((col) => `p.${col}`);

    if (safeFields.length > 0) {
      selectColumns = safeFields.join(", ");
    }
  }

  const whereClauses = ["p.is_published = true"];
  const values = [];

  if (filter.product_type) {
    values.push(filter.product_type);
    whereClauses.push(`p.product_type = $${values.length}`);
  }

  const orderByClause =
    sort === "ctime"
      ? "p.updated_at DESC, p.id DESC"
      : "p.updated_at ASC, p.id ASC";

  values.push(safeLimit);
  const limitPlaceholder = `$${values.length}`;

  values.push(offset);
  const offsetPlaceholder = `$${values.length}`;

  if (filter.product_ids && filter.product_ids.length > 0) {
    values.push(filter.product_ids);
    whereClauses.push(`p.id = ANY($${values.length})`);
  }
  const sql = `
    SELECT ${selectColumns}
    FROM products p
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY ${orderByClause}
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};
  `;

  const result = await pool.query(sql, values);

  return result.rows;
};

const searchProductByUser = async ({ keySearch, limit = 50, skip = 0 }) => {
  const sql = `
    SELECT 
      p.*,
       ts_rank_cd(p.textsearchable_index_col, query) AS score
    FROM products p, 
         websearch_to_tsquery('english', $1) query  
     WHERE p.textsearchable_index_col @@ query 
      AND p.is_published = true  
     ORDER BY score DESC
    LIMIT $2 OFFSET $3;
  `;

  const values = [keySearch, limit, skip];

  try {
    const result = await pool.query(sql, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};
/**
 * Find all draft products for a specific shop
 * @param {Object} query - Query parameters for filtering and pagination
 * @param {Number} limit - Number of products to return
 * @param {Number} skip - Number of products to skip for pagination
 */
const queryProduct = async ({ query, limit, skip }) => {
  const findAllDraftQuery = `
    SELECT 
        p.*,
        json_build_object(
            'name', a.user_name,
            'email', a.email
        ) AS product_shop
    FROM products p
    INNER JOIN accounts a ON p.product_shop = a.id
    WHERE p.product_shop = $1 AND p.is_draft = $2 AND p.is_published = $3
    ORDER BY p.updated_at DESC 
    LIMIT $4 OFFSET $5
  `;

  const values = [
    query.product_shop,
    query.is_draft,
    query.is_published,
    limit,
    skip,
  ];

  try {
    const result = await pool.query(findAllDraftQuery, values);
    return result.rows;
  } catch (error) {
    error.message = `[Repo] Lỗi truy vấn: ` + error.message;
    throw error;
  }
};

const publishProductByShop = async ({ product_shop, product_id }) => {
  const foundShop = await pool.query("SELECT * FROM accounts WHERE id=$1", [
    product_shop,
  ]);
  if (foundShop.rows.length === 0)
    throw new BadRequestError("Update unsuccessful!");

  const publishedProduct = await pool.query(
    "UPDATE products SET is_draft= false, is_published=true WHERE id=$1 AND product_shop = $2 RETURNING *;",
    [product_id, product_shop],
  );
  if (publishedProduct.rows.length > 0) {
    return publishedProduct.rows[0];
  }
  throw new BadRequestError("Update unsuccessful!");
};
const unPublishProductByShop = async ({ product_shop, product_id }) => {
  const foundShop = await pool.query("SELECT * FROM accounts WHERE id=$1", [
    product_shop,
  ]);
  if (foundShop.rows.length === 0)
    throw new BadRequestError("Update unsuccessful!");

  const unPublishedProduct = await pool.query(
    "UPDATE products SET is_draft= true, is_published=false WHERE id=$1 AND product_shop = $2 RETURNING *;",
    [product_id, product_shop],
  );
  if (unPublishedProduct.rows.length > 0) {
    return unPublishedProduct.rows[0];
  }
  throw new BadRequestError("Update unsuccessful!");
};

module.exports = {
  findAllPublishedProductByShop,
  findAllDraftProductByShop,
  publishProductByShop,
  unPublishProductByShop,
  searchProductByUser,
  findAllProducts,
  updateProductRepo,
  updateElectronicsRepo,
  updateClothingRepo,
};
