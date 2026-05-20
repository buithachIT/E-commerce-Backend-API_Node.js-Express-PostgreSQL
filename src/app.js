const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// init middlewares
app.use(morgan("dev"));
app.use(helmet());
app.use(compression());

// init db
require("./dbs/init.postgres");

// init routes
app.use("/", require("./routes"));
//handling error
app.use((req, res, next) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  const statusCode = error.status || 500;
  return res.status(statusCode).json({
    status: "error",
    code: statusCode,
    message: error.message || "Internal Server Error",
  });
});

module.exports = app;
