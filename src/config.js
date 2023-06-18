const path = require("path");

const isProduction = () => {
  const env = process.env.NODE_ENV || "development";
  const isProduction = env === "production";
  return isProduction;
};

const getEnvironments = () => {
  if (isProduction()) return process.env.APP_BASE_URL_PRODUCTION ? process.env.APP_BASE_URL_PRODUCTION : "production_env_not_found";
  else if (!isProduction()) return process.env.APP_BASE_URL_DEVELOPMENT ? process.env.APP_BASE_URL_DEVELOPMENT : "development_env_not_found";

  return "unknown_env";
};

const getMongoDbUrl = () => {
  if (isProduction()) return process.env.MONGO_URL_PRODUCTION ? process.env.MONGO_URL_PRODUCTION : "production_env_not_found";
  else if (!isProduction()) return process.env.MONGO_URL_DEVELOPMENT ? process.env.MONGO_URL_DEVELOPMENT : "development_env_not_found";

  return "unknown_env";
};

const config = {
  APP_NAME: "BACKUP",
  API_ROOT: getEnvironments(),
  MONGODB_URL: getMongoDbUrl(),
  DEFAULT_LANG_CODE: "uz",
  PROJECT_ID: 1,
  PORT: process.env.PORT,
  SECRET: process.env.SALT,
  CACHE_PATH: path.join(__dirname, isProduction() ? process.env.CACHE_PATH_PRODUCTION : process.env.CACHE_PATH_DEVELOPMENT),
  TELEGRAM_BOT_API: isProduction() ? process.env.TELEGRAM_BOT_API_PRODUCTION : process.env.TELEGRAM_BOT_API_DEVELOPMENT,
  TELEGRAM_BOT_USERNAME: isProduction() ? process.env.TELEGRAM_BOT_USERNAME_PRODUCTION : process.env.TELEGRAM_BOT_USERNAME_DEVELOPMENT,
};

module.exports = config;
