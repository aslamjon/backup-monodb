const TelegramApi = require("node-telegram-bot-api");
const { get } = require("lodash");
const { TELEGRAM_BOT_API } = require("../../config");
const { startCommand, infoCommand } = require("./commands");

const fileName = require("path").basename(__filename);

const bot = new TelegramApi(TELEGRAM_BOT_API, { polling: true });

bot.setMyCommands([{ command: "/start", description: "Start" }]);

// const contactController = async (msg) => {
//   const chatId = msg.chat.id;
//   const userId = msg.contact.user_id;

//   try {
//     if (chatId !== userId) return bot.sendMessage(chatId, `${msg.from.first_name} Iltimos o'zingizni telefon raqamingizni yuboring`);

//     const phoneNumberExists = await BotUserModel.findOne({ phoneNumber: msg.contact.phone_number });
//     if (phoneNumberExists)
//       return bot.sendMessage(chatId, `Qaytganingiz uchun rahmat. Botni imkonyatlaridan foydalanishingiz mumkin`, removeAllOptions);
//     else {
//       const newUser = new BotUserModel({
//         phoneNumber: get(msg, "contact.phone_number", ""),
//         fullName: get(msg, "contact.first_name", "") + get(msg, "contact.last_name", ""),
//         chatId,
//         isAdmin: admins[chatId] ? admins[chatId] : false,
//       });

//       await newUser.save();
//       return bot.sendMessage(chatId, `Rahmat ${msg.from.first_name}`, removeAllOptions);
//     }
//   } catch (e) {
//     errorHandlerBot(e, contactController.name, fileName);
//   }
// };

// const locationController = async (msg) => {
//   const chatId = msg.chat.id;
//   const user = await BotUserModel.findOne({ chatId });

//   if (!user) {
//     bot.sendMessage(chatId, `${msg.from.first_name} start tugmasini bosing`, startOpitons);
//   } else {
//     user.latitude = msg.location.latitude;
//     user.longitude = msg.location.longitude;
//     await user.save();
//     bot.sendMessage(chatId, `Rahmat ${msg.from.first_name} endi siz botimizni imkonyatlaridan foydalanishingiz mumkin`, removeAllOptions);
//   }
// };

// const callbackQueryController = async (msg) => {
//   const data = msg.data;
//   const chatId = msg.message.chat.id;

//   if (data === "/again") return startGame(chatId);
//   console.log("callback_query", msg);

//   if (!chats[chatId]) return bot.sendMessage(chatId, "🖐 Faqat bir marta bosish mumkin");
//   if (data === chats[chatId]) {
//     delete chats[chatId];
//     return bot.sendMessage(chatId, `🏆Tabriklayman, siz to'g'ri soni tanladingiz, ${chats[chatId]}`);
//   } else {
//     delete chats[chatId];
//     return bot.sendMessage(chatId, `🤦Afsuski noto'g'ri soni tanladingiz, ${chats[chatId]}`, againOptions);
//   }
// };

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
