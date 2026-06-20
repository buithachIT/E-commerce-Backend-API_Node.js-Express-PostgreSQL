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

module.exports = {
  getOrCreateCartId,
};
