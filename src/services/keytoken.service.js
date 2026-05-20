"use strict";

const instancePostgres = require("../dbs/init.postgres");

class KeyTokenService {
  static createKeyToken = async ({ userId, publicKey, privateKey }) => {
    const pool = instancePostgres.pool;
    try {
      const publicKeyString = publicKey.toString();
      const privateKeyString = privateKey.toString();

      const createKeyStoresQuery = `INSERT INTO key_stores (account_id, public_key, private_key) VALUES ($1, $2, $3) RETURNING *`;

      const newKeyStore = await pool.query(createKeyStoresQuery, [
        userId,
        publicKeyString,
        privateKeyString,
      ]);

      return newKeyStore ? newKeyStore.rows[0].public_key : null;
    } catch (error) {
      console.error("KEY_TOKEN_SERVICE ERORR:", error.message);
      throw error;
    }
  };
}
module.exports = KeyTokenService;
