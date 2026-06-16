"use strict";

const { pool } = require("../dbs/init.postgres");
const crypto = require("crypto");
const findById = async (key) => {
  try {
    const findKeyQuery =
      "SELECT key, permissions FROM api_keys WHERE key=$1 AND status = true LIMIT 1";

    // const newKey = await pool.query(
    //   "INSERT INTO api_keys(key, permissions) VALUES ($1, $2) RETURNING key",
    //   [crypto.randomBytes(64).toString("hex"), ["0000"]],
    // );
    // console.log("NewKey", newKey.rows[0]);

    const objKey = await pool.query(findKeyQuery, [key]);
    return objKey.rows.length > 0 ? objKey.rows[0] : null;
  } catch (error) {
    console.error("API_KEY_SERVICE ERROR::findById:", error.message);
    throw error;
  }
};

module.exports = {
  findById,
};
