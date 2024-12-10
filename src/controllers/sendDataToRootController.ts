import { Request, Response } from "express";
import { renameSync, unlinkSync } from "fs";
import { bot } from "../integration/telegram";
import { CACHE_PATH, ROOT_PASSWORD, ROOT_USERNAME } from "../config";
import { IMulterFile } from "../interface";
import { sendFileToChat } from "./telegramController";

const sendFileWithBot = async (req: Request & { files: any[] }, res: Response) => {
  const { chatId } = req.params;
  try {
    const { username, password } = req.body;

    if (username !== ROOT_USERNAME || password !== ROOT_PASSWORD) {
      await bot.sendMessage(chatId, "username or password is invalid");
      res.send({ message: "username or password is invalid" });
      return;
    }

    const temp: Record<string, IMulterFile> = {};
    req.files.forEach((item) => (temp[item.fieldname] = item));

    if (!temp?.file) {
      bot.sendMessage(chatId, "file should not be empty");
      res.send({ message: "file should not be empty" });
      return;
    }

    const filePath = temp.file.path;
    const newFilePath = `${CACHE_PATH}/${temp.file.originalname}`;

    renameSync(filePath, newFilePath);

    await bot.sendDocument(chatId, newFilePath);

    unlinkSync(newFilePath);

    res.send({ message: "ok" });
  } catch (error) {
    bot.sendMessage(chatId, "error.message");
    res.status(500).send({ message: error.message });
  }
};

const sendFileWithUser = async (req: Request & { files: any[] }, res: Response) => {
  const { chatId } = req.params;
  try {
    const { username, password, caption } = req.body;

    if (username !== ROOT_USERNAME || password !== ROOT_PASSWORD) {
      await bot.sendMessage(chatId, "username or password is invalid");
      res.send({ message: "username or password is invalid" });
      return;
    }

    const temp: Record<string, IMulterFile> = {};
    req.files.forEach((item) => (temp[item.fieldname] = item));

    if (!temp?.file) {
      bot.sendMessage(chatId, "file should not be empty");
      res.send({ message: "file should not be empty" });
      return;
    }

    const filePath = temp.file.path;
    const newFilePath = `${CACHE_PATH}/${temp.file.originalname}`;

    renameSync(filePath, newFilePath);

    await sendFileToChat(chatId, newFilePath, caption);

    unlinkSync(newFilePath);

    res.send({ message: "ok" });
  } catch (error) {
    bot.sendMessage(chatId, "error.message");
    res.status(500).send({ message: error.message });
  }
};

const sendMessageWithBot = async (req: Request, res: Response) => {
  const { chatId } = req.params;
  try {
    const { username, password, message } = req.body;

    if (username !== ROOT_USERNAME || password !== ROOT_PASSWORD) {
      await bot.sendMessage(chatId, "username or password is invalid");
      res.send({ message: "username or password is invalid" });
      return;
    }

    await bot.sendMessage(chatId, message);

    res.send({ message: "ok" });
  } catch (error) {
    bot.sendMessage(chatId, "error.message");
    res.status(500).send({ message: error.message });
  }
};

export { sendFileWithBot, sendFileWithUser, sendMessageWithBot };
