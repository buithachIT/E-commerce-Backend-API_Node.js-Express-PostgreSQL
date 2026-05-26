"use strict";

const instancePostgres = require("../dbs/init.postgres");

const findByEmail = async ({
  email,
  select = ["id", "email", "password", "user_name", "avatar_url"],
}) => {
  const pool = instancePostgres.pool;

  const selectColumns = select.join(", ");

  const findByEmailQuery = `SELECT ${selectColumns} FROM accounts WHERE email = $1 LIMIT 1`;

  const result = await pool.query(findByEmailQuery, [email]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  findByEmail,
};
