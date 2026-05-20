require("dotenv").config();

const app = require("./src/app");
const PORT = process.env.PORT || 3056;
const server = app.listen(PORT, () => {
  console.log("Shopee clone app start with port: ", PORT);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Exit Server Express (Shopee clone)");
  });
  const instancePostgres = require("./src/dbs/init.postgres");
  if (instancePostgres && instancePostgres.pool) {
    instancePostgres.pool.end(() => {
      console.log("Closed DB connection!");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
