"use strict";

const { Pool } = require("pg");
const config = require("../configs/config.postgres");
const connectString = `postgresql://${config.db.user}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.database}`;

class Database {
  constructor() {
    this.connect();
  }

  connect() {
    if (1 === 1) {
      console.log("--- Debug PostgreSQL mode is running ---");
    }

    this.pool = new Pool({
      connectionString: connectString,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    this.pool.connect((err, client, release) => {
      if (err) {
        console.log("Error Connect Postgres!", err.stack);
        return;
      }

      console.log("Connected Postgres Success !");

      const {
        countConnect,
        checkOverload,
      } = require("../helpers/check.connect");
      countConnect();
      checkOverload();
      release();
    });
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
}

const instancePostgres = Database.getInstance();
module.exports = instancePostgres;
