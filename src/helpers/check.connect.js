"use strict";

const { Pool } = require("pg");
const instancePostgres = require("../dbs/init.postgres");
const os = require("os");
const _SECONDS = 10000;

//count connect
const countConnect = () => {
  if (instancePostgres && instancePostgres.pool) {
    const numClients = instancePostgres.pool.totalCount;
    console.log(`Number of connections: ${numClients}`);
  } else {
    console.log("Db connection is not established yet.");
  }
};

//check overload
const checkOverload = () => {
  setInterval(() => {
    const numConnection = instancePostgres.pool.totalCount;
    const numCores = os.cpus().length;
    const memoryUsage = process.memoryUsage().rss;

    //Example maxmum member of connections based on number osf cores
    const maxConnections = numCores * 5;

    console.log(`Active connections: ${numConnection}`);
    console.log(`Memory usage:: ${memoryUsage / 1024 / 1024} MB`);

    if (numConnection > maxConnections) {
      console.log(`Connection overload detected!`);
    }
  }, _SECONDS); //Monitor every 5 second;
};

module.exports = { countConnect, checkOverload };
