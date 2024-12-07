const TelegramApi = require("node-telegram-bot-api");
const { TELEGRAM_BOT_API } = require("../../config");
const { startCommand, infoCommand } = require("./commands");

const bot = new TelegramApi(TELEGRAM_BOT_API, { polling: true });

bot.setMyCommands([{ command: "/start", description: "Start" }]);

const messageController = async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;

  if (text === "/start") return startCommand(bot, msg);
  else if (text === "/info") return infoCommand(bot, msg);

  // console.log(msg);
  // if (!msg.contact && !msg.location && msg.document && !get(msg, "text", "").startsWith("/"))
  //   return bot.sendMessage(chatId, "Men bu narsani bilmayman");
};

const errorController = async (error) => {
  console.log(error.code);
};

const init = () => {
  bot.on("message", messageController);

  // bot.on("contact", contactController);

  bot.on("document", (msg) => {
    // file
  });

  // bot.on("location", locationController);

  // bot.on("callback_query", callbackQueryController);

  // SHOW ERROR => 'EFATAL'
  bot.on("polling_error", errorController);

  // SHOW WEBHOOK ERROR => 'EPARSE'
  bot.on("webhook_error", errorController);
};

module.exports = {
  init,
  bot,
};
