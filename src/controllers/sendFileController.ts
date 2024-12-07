import { Request, Response } from "express";
import { get } from "lodash";
import { statSync, unlinkSync } from "fs";
import { bot } from "../integration/telegram";
import { isProduction, ROOT_PASSWORD, ROOT_USERNAME, TELEGRAM_API_HASH, TELEGRAM_SESSION, TELEGRAM_USER_API_ID } from "../config";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const sendFileWithBot = async (req: Request & { files: any[] }, res: Response) => {
  const { chatId } = req.params;
  try {
    const { username, password } = req.body;

    if (username !== ROOT_USERNAME || password !== ROOT_PASSWORD) return bot.sendMessage(chatId, "username or password is invalid"), null;

    const temp = {};
    req.files.forEach((item) => (temp[item.fieldname] = item));

    if (!get(temp, "file")) return bot.sendMessage(chatId, "file should not be empty"), null;

    const filePath = get(temp, "file.path");

    await bot.sendDocument(chatId, filePath);

    unlinkSync(filePath);

    res.send({ message: "ok" });
  } catch (error) {
    bot.sendMessage(chatId, "error.message");
    res.status(500).send({ message: error.message });
  }
};

const sendFileWithUser = async (req: Request & { files: any[] }, res: Response) => {
  const { chatId } = req.params;
  const stringSession = new StringSession(TELEGRAM_SESSION);

  const client = new TelegramClient(stringSession, Number(TELEGRAM_USER_API_ID), TELEGRAM_API_HASH, { connectionRetries: 5 });

  try {
    const { username, password, name } = req.body;

    if (username !== ROOT_USERNAME || password !== ROOT_PASSWORD) return bot.sendMessage(chatId, "username or password is invalid"), null;

    const temp = {};
    req.files.forEach((item) => (temp[item.fieldname] = item));

    if (!get(temp, "file")) return bot.sendMessage(chatId, "file should not be empty"), null;

    const filePath = get(temp, "file.path");

    await client.connect();

    if (await client.checkAuthorization()) {
      const messageResult = await client.sendMessage(chatId, { message: "0% of 100%" });

      const fileSize = statSync(filePath);
      const fileSizeInBytes = fileSize.size;
      const fileSizeInKilobytes = fileSizeInBytes / 1024;
      const fileSizeInMegabytes = fileSizeInKilobytes / 1024;

      await client.sendFile(chatId, {
        file: filePath,
        caption: name,
        progressCallback: (process) => {
          !isProduction && console.log(`${(process * 100).toFixed(3)}% of 100% - ${name}`);

          if (Number((process * 100).toFixed(0)) % 2 === 0) {
            const uploaded = (fileSizeInBytes * (process * 100)) / 100;
            const uploadedKilobytes = uploaded / 1024;
            const uploadedMegabytes = uploadedKilobytes / 1024;
            client.editMessage(chatId, {
              message: get(messageResult, "id"),
              text: `#${name}\n${(process * 100).toFixed(3)}% of 100%.\n\nUploaded ${uploadedKilobytes.toFixed(1)} of ${fileSizeInKilobytes.toFixed(
                1
              )} KB\nUploaded ${uploadedMegabytes.toFixed(1)} of ${fileSizeInMegabytes.toFixed(1)} MB`,
            });
          }
        },
      });

      setTimeout(() => client.deleteMessages(chatId, [get(messageResult, "id")], { revoke: true }), 10000);

      // console.log("Message details:", result);
    } else {
      console.log("I am connected to telegram servers but not logged in with any account/bot");
    }

    unlinkSync(get(temp, "file.path"));

    res.send({ message: "ok" });
  } catch (error) {
    bot.sendMessage(chatId, "error.message");
    res.status(500).send({ message: error.message });
  } finally {
    setTimeout(() => client.disconnect(), 11000);
  }
};

export { sendFileWithBot, sendFileWithUser };
