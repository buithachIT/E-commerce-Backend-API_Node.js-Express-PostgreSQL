"use strict";

const instancePostgres = require("../dbs/init.postgres");

class KeyTokenService {
  static createKeyToken = async ({
    userId,
    publicKey,
    privateKey,
    refresh_token,
  }) => {
    const pool = instancePostgres.pool;
    try {
      // const createKeyStoresQuery = `INSERT INTO key_stores (account_id, public_key, private_key) VALUES ($1, $2, $3) RETURNING *`;

      // const newKeyStore = await pool.query(createKeyStoresQuery, [
      //   userId,
      //   publicKeyString,
      //   privateKeyString,
      // ]);

      // return newKeyStore ? newKeyStore.rows[0].public_key : null;

      //Level XX
      const upsertQuery = `
        INSERT INTO key_stores (account_id, public_key, private_key, refresh_tokens_used, refresh_token)
        VALUES ($1,$2,$3, '{}', $4)
        ON CONFLICT (account_id)
        DO UPDATE SET 
          public_key = EXCLUDED.public_key,
          private_key = EXCLUDED.private_key,
          refresh_tokens_used = '{}',
          refresh_token = EXCLUDED.refresh_token
        RETURNING public_key
      `;

      const values = [userId, publicKey, privateKey, refresh_token];
      const result = await pool.query(upsertQuery, values);
      return result.rows.length > 0 ? result.rows[0].public_key : null;
    } catch (error) {
      console.error("KEY_TOKEN_SERVICE ERROR:", error.message);
      throw error;
    }
  };
  static findUserById = async (userId) => {
    const pool = instancePostgres.pool;
    const findUserByIdQuery =
      "SELECT * FROM key_stores WHERE account_id = $1 LIMIT 1 FOR UPDATE";

    const keys = await pool.query(findUserByIdQuery, [userId]);

    return keys.rows.length > 0 ? keys.rows[0] : null;
  };

  static removeKeyById = async (id) => {
    const pool = instancePostgres.pool;
    const removeKeyByIdQuery =
      "DELETE FROM key_stores WHERE id = $1 RETURNING id";

    const removeKey = await pool.query(removeKeyByIdQuery, [id]);
    return removeKey.rows.length > 0 ? removeKey.rows[0] : null;
  };

  static findByRefreshTokenUsed = async (refreshToken) => {
    const pool = instancePostgres.pool;
    const findByRefreshTokenUsed =
      "SELECT * FROM key_stores WHERE refresh_tokens_used @> $1::varchar[] LIMIT 1";

    const result = await pool.query(findByRefreshTokenUsed, [[refreshToken]]);
    return result.rows.length > 0 ? result.rows[0] : null;
  };
  static deleteKeyById = async (userId) => {
    const pool = instancePostgres.pool;
    const deleteKeyByIdQuery =
      "DELETE FROM key_stores WHERE account_id = $1 RETURNING id";

    const result = await pool.query(deleteKeyByIdQuery, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  };
  static findByRefreshToken = async (refreshToken) => {
    const pool = instancePostgres.pool;
    const findByRefreshTokenQuery =
      "SELECT * FROM key_stores WHERE refresh_token = $1 LIMIT 1";

    const result = await pool.query(findByRefreshTokenQuery, [refreshToken]);
    return result.rows.length > 0 ? result.rows[0] : null;
  };
  static updateRefreshTokenUsed = async (refreshTokenUsed, newRefreshToken) => {
    const pool = instancePostgres.pool;
    const updateRefreshTokenUsedQuery = `
      UPDATE key_stores
      SET refresh_tokens_used = array_append(refresh_tokens_used, $1), refresh_token = $2
      WHERE refresh_token = $1
      RETURNING id
    `;
    const result = await pool.query(updateRefreshTokenUsedQuery, [
      refreshTokenUsed,
      newRefreshToken,
    ]);
    return result.rows.length > 0 ? result.rows[0] : null;
  };
}
module.exports = KeyTokenService;
