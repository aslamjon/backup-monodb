import TelegramApi, { Message } from "node-telegram-bot-api";
import { API_ROOT, TELEGRAM_BOT_API, TELEGRAM_BOT_WEBHOOK_PATH } from "../../config";
import { startCommand, infoCommand } from "./commands";

let bot: TelegramApi | null = null;

const messageController = async (msg: Message) => {
  const text = msg.text;

  if (text === "/start") return startCommand(msg);
  else if (text === "/info") return infoCommand(msg);

  // console.log(msg);
  // if (!msg.contact && !msg.location && msg.document && !get(msg, "text", "").startsWith("/"))
  //   return bot.sendMessage(chatId, "Men bu narsani bilmayman");
};

const errorController = async (error: Error) => {
  console.log(error);
};

const init = () => {
  process.env.DEBUG = "node-telegram-bot-api";
  bot = new TelegramApi(TELEGRAM_BOT_API, { webHook: true });

  bot.setMyCommands([{ command: "/start", description: "Start" }]);

  console.log(API_ROOT);
  bot.setWebHook(`${API_ROOT}/${TELEGRAM_BOT_WEBHOOK_PATH}`);

  bot.on("message", messageController);

  // bot.on("contact", contactController);

  bot.on("document", () => {
    // file
  });

  // bot.on("location", locationController);

  // bot.on("callback_query", callbackQueryController);

  // SHOW ERROR => 'EFATAL'
  bot.on("polling_error", errorController);

  // SHOW WEBHOOK ERROR => 'EPARSE'
  bot.on("webhook_error", errorController);
};

export { init, bot };
