const path = require("path");

const checkProduction = () => {
  const env = process.env.NODE_ENV || "development";
  const isProduction = env === "production";
  return isProduction;
};

const isProduction = checkProduction();

const getEnvironments = () => {
  if (isProduction) return process.env.APP_BASE_URL_PRODUCTION ? process.env.APP_BASE_URL_PRODUCTION : "production_env_not_found";
  else if (!isProduction) return process.env.APP_BASE_URL_DEVELOPMENT ? process.env.APP_BASE_URL_DEVELOPMENT : "development_env_not_found";

  return "unknown_env";
};

const getMongoDbUrl = () => {
  if (isProduction) return process.env.MONGO_URL_PRODUCTION ? process.env.MONGO_URL_PRODUCTION : "production_env_not_found";
  else if (!isProduction) return process.env.MONGO_URL_DEVELOPMENT ? process.env.MONGO_URL_DEVELOPMENT : "development_env_not_found";

  return "unknown_env";
};

const getMongoDBUser = () => {
  if (isProduction) return process.env.MONGO_USER_PRODUCTION ? process.env.MONGO_USER_PRODUCTION : "production_env_not_found";
  else return process.env.MONGO_USER_DEVELOPMENT ? process.env.MONGO_USER_DEVELOPMENT : "development_env_not_found";
  return "unknown_env";
};

const getMongoDBPassword = () => {
  if (isProduction) return process.env.MONGO_PASSWORD_PRODUCTION ? process.env.MONGO_PASSWORD_PRODUCTION : "production_env_not_found";
  else return process.env.MONGO_PASSWORD_DEVELOPMENT ? process.env.MONGO_PASSWORD_DEVELOPMENT : "development_env_not_found";
  return "unknown_env";
};

const config = {
  APP_NAME: "BACKUP",
  API_ROOT: getEnvironments(),
  MONGODB_URL: getMongoDbUrl(),
  MONGO_USER: getMongoDBUser(),
  MONGO_PASSWORD: getMongoDBPassword(),
  DEFAULT_LANG_CODE: "uz",
  PROJECT_ID: 1,
  PORT: process.env.PORT,
  SECRET: process.env.SALT,
  isProduction,
  CACHE_PATH: path.join(__dirname, isProduction ? process.env.CACHE_PATH_PRODUCTION : process.env.CACHE_PATH_DEVELOPMENT),
  TELEGRAM_BOT_API: isProduction ? process.env.TELEGRAM_BOT_API_PRODUCTION : process.env.TELEGRAM_BOT_API_DEVELOPMENT,
  TELEGRAM_BOT_USERNAME: isProduction ? process.env.TELEGRAM_BOT_USERNAME_PRODUCTION : process.env.TELEGRAM_BOT_USERNAME_DEVELOPMENT,
  TELEGRAM_USER_API_ID: isProduction ? process.env.TELEGRAM_USER_API_ID_PRODUCTION : process.env.TELEGRAM_USER_API_ID_DEVELOPMENT,
  TELEGRAM_APIHASH: isProduction ? process.env.TELEGRAM_APIHASH_PRODUCTION : process.env.TELEGRAM_APIHASH_DEVELOPMENT,
  TELEGRAM_SESSION: isProduction ? process.env.TELEGRAM_SESSION_PRODUCTION : process.env.TELEGRAM_SESSION_DEVELOPMENT,
};

module.exports = config;
