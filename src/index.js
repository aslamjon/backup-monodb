// Requiring module
const express = require("express");
const cors = require("cors");
const path = require("path");
const compression = require("compression");
require("dotenv").config();
const logger = require("./utils/logger");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");

const config = require("./config");

const { init: startTelegramBot } = require("./integration/telegram/index");
const { createDefaultFolder, errorHandlerBot } = require("./utils/utiles");
const { init } = require("./controllers");
const router = require("./router");

const app = express();

function shouldCompress(req, res) {
  // don't compress responses with this request header
  if (req.headers["x-no-compression"]) return false;
  // fallback to standard filter function
  return compression.filter(req, res);
}

const limiter = rateLimit({
  windowMs: 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const corsOptions = {
  allowedHeaders: ["Content-Type", "Authorization", "Content-Length", "withCredentials", "credential", "credentials", "Timezone"],
  methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"],
  maxAge: 7200,
};

app.use(cors(corsOptions));

// Apply the rate limiting middleware to API calls only
app.use("/api", limiter);

// COMPRESS MIDDLEWARES
app.use(compression({ filter: shouldCompress }));

try {
  createDefaultFolder(config.CACHE_PATH);
} catch (e) {
  errorHandlerBot(e, { name: "index.js" }, "main index.js");
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ extended: true })); // if json come backend then it convert to obj in req.body

app.use("/", express.static(path.join(__dirname, "./public")));

app.use("/api", router);

app.use(express.static("routes"));

// catch 404 and forward to error handler
app.use(async (req, res, next) => {
  try {
    throw new Error("API Not Found. Please check it and try again.");
  } catch (err) {
    err.status = 404;

    console.log(err.message, err.status, req.method, req.originalUrl);
    next(err);
  }
});

// Error handle
app.use((err, req, res, next) => {
  // console.log("[Global error middleware]", err.message, err.status, req.method, req.url);
  err.status !== 404 &&
    logger.error(`
  [Global error middleware] 
  ${err.message} 
  ${err.status} 
  ${req.method} 
  ${req.url} 
  ${err.stack} `);
  res.status(err.status ? err.status : 500).send({
    error: err.message,
  });
  next();
});

const PORT = config.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
  console.log(config, process.env.NODE_ENV);

  !config.isTest && startTelegramBot();
  if (config.isProduction) init();
  !config.isTest && cron.schedule(`0 0 * * *`, init);
  // cron.schedule(`* * * * *`, init);
});
