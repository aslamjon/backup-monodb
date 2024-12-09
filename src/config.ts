import { get } from "lodash";
import path from "path";

export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

const getVariable = (name: string, isCheckAllEnv: boolean = false): string => {
  if (isProduction) return get(process.env, `${name}_PRODUCTION`) ? get(process.env, `${name}_PRODUCTION`, "") : "production_env_not_found";
  else if (isTest && isCheckAllEnv) return get(process.env, `${name}_TEST`) ? get(process.env, `${name}_TEST`, "") : "test_env_not_found";
  else return get(process.env, `${name}_DEVELOPMENT`) ? get(process.env, `${name}_DEVELOPMENT`, "") : "development_env_not_found";
};

export const APP_NAME = "BACKUP";
export const API_ROOT = getVariable("APP_BASE_URL", true);
export const API_ROOT_TEST = process.env.APP_BASE_URL_TEST;
export const MONGODB_URL = getVariable("MONGO_URL");
export const MONGO_USER = getVariable("MONGO_USER");
export const MONGO_PASSWORD = getVariable("MONGO_PASSWORD");
export const PORT = process.env.PORT;
export const CACHE_PATH = path.join(__dirname, getVariable("CACHE_PATH"));
export const TELEGRAM_BOT_API = getVariable("TELEGRAM_BOT_API");
export const TELEGRAM_BOT_USERNAME = getVariable("TELEGRAM_BOT_USERNAME");
export const TELEGRAM_USER_API_ID = getVariable("TELEGRAM_USER_API_ID");
export const TELEGRAM_API_HASH = getVariable("TELEGRAM_API_HASH");
export const TELEGRAM_SESSION = getVariable("TELEGRAM_SESSION");
export const TELEGRAM_BOT_WEBHOOK_PATH = process.env.TELEGRAM_BOT_WEBHOOK_PATH;
export const ROOT_USERNAME = getVariable("ROOT_USERNAME");
export const ROOT_PASSWORD = getVariable("ROOT_PASSWORD");
