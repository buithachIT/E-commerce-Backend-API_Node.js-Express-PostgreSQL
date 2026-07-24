"use strict";

const instancePostgres = require("../dbs/init.postgres");

const ALLOWED_ACCOUNT_COLUMNS = [
  "id",
  "email",
  "password",
  "user_name",
  "avatar_url",
  "email_verified",
  "created_at",
];

const buildSelect = (select = []) => {
  const safe = select.filter((col) => ALLOWED_ACCOUNT_COLUMNS.includes(col));
  return (safe.length ? safe : ["id", "email", "user_name"]).join(", ");
};

const findByEmail = async ({
  email,
  select = ["id", "email", "password", "user_name", "avatar_url"],
}) => {
  const pool = instancePostgres.pool;
  const findByEmailQuery = `SELECT ${buildSelect(select)} FROM accounts WHERE email = $1 LIMIT 1`;
  const result = await pool.query(findByEmailQuery, [email]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const findById = async ({
  userId,
  select = ["id", "email", "user_name", "avatar_url", "email_verified", "created_at"],
}) => {
  const pool = instancePostgres.pool;
  const result = await pool.query(
    `SELECT ${buildSelect(select)} FROM accounts WHERE id = $1 LIMIT 1`,
    [userId],
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  findByEmail,
  findById,
};
