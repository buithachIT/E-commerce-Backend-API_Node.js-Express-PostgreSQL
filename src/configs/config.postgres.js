"use strict";

const dev = {
  app: {
    port: process.env.DEV_APP_PORT || 3052,
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
    port: process.env.PROD_APP_PORT || 3052,
  },
  db: {
    host: process.env.PROD_DB_HOST || "localhost",
    port: process.env.PROD_DB_PORT || 5432,
    database: process.env.PROD_DB_NAME || "shopee_clone",
    user: process.env.PROD_DB_USER || "postgres",
    password: process.env.PROD_DB_PASSWORD || "thach31112003",
  },
};

const config = {
  dev,
  prod,
};

const env = process.env.NODE_ENV || "dev";
module.exports = config[env];
