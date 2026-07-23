"use strict";

const dev = {
  app: {
    port: process.env.DEV_APP_PORT,
  },
  db: {
    host: process.env.DEV_DB_HOST,
    port: process.env.DEV_DB_PORT,
    database: process.env.DEV_DB_NAME,
    user: process.env.DEV_DB_USER,
    password: process.env.DEV_DB_PASSWORD,
  },
};
const prod = {
  app: {
    port: process.env.PROD_APP_PORT,
  },
  db: {
    host: process.env.PROD_DB_HOST,
    port: process.env.PROD_DB_PORT,
    database: process.env.PROD_DB_NAME,
    user: process.env.PROD_DB_USER,
    password: process.env.PROD_DB_PASSWORD,
  },
};

const config = {
  dev,
  prod,
};

const rawEnv = process.env.NODE_ENV || "dev";
const env = rawEnv === "production" ? "prod" : rawEnv;
module.exports = config[env] || config.dev;
