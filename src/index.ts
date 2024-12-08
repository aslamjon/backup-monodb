// Requiring module
import express from "express";
import cors from "cors";
import path from "path";
import compression from "compression";
require("dotenv").config();
import logger from "./utils/logger";
import rateLimit from "express-rate-limit";
import cron from "node-cron";

import { init as startTelegramBot } from "./integration/telegram/index";
import { createDefaultFolder, errorHandlerBot } from "./utils/utiles";
import { init } from "./controllers";
import router from "./router";
import { CACHE_PATH, isProduction, isTest, PORT } from "./config";

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
  createDefaultFolder(CACHE_PATH);
} catch (e) {
  errorHandlerBot(e, "index.js", "main index.js");
}

app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use(express.json({ limit: "1mb" })); // if json come backend then it convert to obj in req.body

app.use("/", express.static(path.join(__dirname, "./public")));

app.use("/api", router);

app.use(express.static("routes"));

// catch 404 and forward to error handler
app.use(async (req, _res, next) => {
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

app.listen(PORT || 3000, () => {
  !isTest && startTelegramBot();
  if (isProduction) init();
  !isTest && cron.schedule(`0 0 * * *`, init);
  // cron.schedule(`* * * * *`, init);
});
