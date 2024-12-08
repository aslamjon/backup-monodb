import { Message } from "node-telegram-bot-api";
import { bot } from ".";

const startCommand = async (msg: Message) => {
  const chatId = msg.chat.id;

  return bot.sendMessage(
    chatId,
    `assalomu aleykum ${msg.from.first_name}.
  `
  );
};

const infoCommand = async (msg: Message) => {
  return bot.sendMessage(msg.chat.id, `sizning ismingiz ${msg.from.first_name}`);
};

export { startCommand, infoCommand };
