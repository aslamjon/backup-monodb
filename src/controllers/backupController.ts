import archiver from "archiver";
import fs from "fs";
import { isEmpty } from "lodash";
import { spawn } from "child_process";
import moment from "moment";
import FormData from "form-data";
import axios from "axios";

import { copyFileAsync } from "../utils/utiles";

import { bot } from "../integration/telegram";
import { sendFileToChat } from "./telegramController";
import { API_ROOT_SERVER, CACHE_PATH, isProduction, isTest, MONGO_PASSWORD, MONGO_USER, ROOT_PASSWORD, ROOT_USERNAME } from "../config";
import { IBackupDatabaseParams, TConfig } from "../interface";

const nodeEnv = process.env.NODE_ENV || "development";

const dumpFromDatabase = async ({ name, filePath }) => {
  const child = spawn(`mongodump`, [
    `--db=${name}`,
    `--archive=${filePath}`,
    `--gzip`,
    `--authenticationDatabase`,
    `admin`,
    `--username`,
    MONGO_USER,
    `--password`,
    MONGO_PASSWORD,
  ]);

  return new Promise((resolve, reject) => {
    child.stdout.on("data", (data) => {
      console.log("stdout", data);
    });
    child.stderr.on("data", (_data) => {
      // show dumping process
      // console.log("stderr", Buffer.from(data).toString());
    });
    child.on("error", reject);
    child.on("exit", resolve);
  });
};

const archiveFolder = async ({ name, folder_path }: { name: string; folder_path: string }): Promise<string> => {
  const date = moment().format("DD_MM_YYYY_HH_mm");

  const outputFilePath = `${CACHE_PATH}/${name}_${nodeEnv}_${date}_backup_folder.zip`;

  const output = fs.createWriteStream(outputFilePath);
  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  archive.pipe(output);

  // Append the folder to the archive
  archive.directory(folder_path, false); // The second parameter 'false' ensures that the folder structure is not included

  // Finalize the archive
  archive.finalize();
  return new Promise((resolve, reject) => {
    output.on("close", () => {
      resolve(outputFilePath);
    });

    archive.on("error", reject);
  });
};

const sendFileToRootServer = async (
  chat_id: string,
  filePath: string,
  to: "bot" | "user" = "bot",
  options?: {
    additionalData?: { key: string; value: string }[];
    onUploadProgress?: (percent: number) => void;
  }
) => {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("username", ROOT_USERNAME);
  formData.append("password", ROOT_PASSWORD);

  options?.additionalData?.forEach(({ key, value }) => formData.append(key, value));

  await axios.post(`${API_ROOT_SERVER}/api/send-file-with-${to}/${chat_id}`, formData, {
    headers: { ...formData.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity, // To handle large files
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 0));
      options?.onUploadProgress?.(percentCompleted);
    },
  });
};

const sendFileWithTelegramBot = async (chat_id: string, filePath: string, fileType: string, type: TConfig) => {
  try {
    if (type === "production" && isProduction) await bot.sendDocument(chat_id, filePath);
    else {
      await sendFileToRootServer(chat_id, filePath);
    }
    // unlink(filePath);
  } catch (error) {
    console.log(`ERROR: ${error.message}.\nStatusCode: ${error.response.statusCode}. \nCould not send ${fileType} file.\npath: ${filePath}`);

    // bot.sendMessage(
    //   chat_id,
    //   `ERROR: ${error.message}.\nStatusCode: ${error.response.statusCode}. \nCould not send ${fileType} file.\npath: ${filePath}`
    // );
    // console.error(`Error sending ${fileType} files:`, error);
  }
};

const sendMessage = async (type: string, group_chat_id: string, message: string) => {
  if (type === "production" && isProduction) await bot.sendMessage(group_chat_id, message);
  else {
    await axios.post(`${API_ROOT_SERVER}/api/send-message-with-bot/${group_chat_id}`, { username: ROOT_USERNAME, password: ROOT_PASSWORD, message });
  }
};

const backupDatabase = async ({
  name,
  group_chat_id,
  folder_path,
  folder_path_dev,
  log_file_path,
  log_file_path_dev,
  client,
  next,
  index,
  type,
}: IBackupDatabaseParams) => {
  try {
    if ((type === "test" && isProduction) || (type === "production" && !isProduction)) return next(index + 1);

    if (!isProduction && !isTest) {
      folder_path = folder_path_dev;
      log_file_path = log_file_path_dev;
    }

    await client.connect();

    const adminDb = client.db("admin");
    const databases = await adminDb.admin().listDatabases();
    const dbFound = databases.databases.find((item) => item.name === name);

    const date = moment().format("DD_MM_YYYY_HH_mm");

    if (isEmpty(dbFound)) return;

    const filePath = `${CACHE_PATH}/${name}_${nodeEnv}_${date}_backup.gzip`;

    await sendMessage(type, group_chat_id, `#${name}`);

    await dumpFromDatabase({ name, filePath });

    await sendFileWithTelegramBot(group_chat_id, filePath, "gzip", type);
    const destinationFilePathOfLog = `${CACHE_PATH}/${name}_${nodeEnv}_${date}_backup_logFile.log`;

    await copyFileAsync(log_file_path, destinationFilePathOfLog);

    await sendFileWithTelegramBot(group_chat_id, destinationFilePathOfLog, "log", type);

    if (folder_path) {
      const outputFilePath = await archiveFolder({ name, folder_path });

      if (type === "production" && isProduction) await sendFileToChat(group_chat_id, outputFilePath);
      else {
        await sendFileToRootServer(group_chat_id, outputFilePath, "user", {
          additionalData: [{ key: "name", value: name }],
          onUploadProgress: (percentCompleted) => console.log(`uploaded ${percentCompleted} %`),
        });
      }

      fs.unlinkSync(outputFilePath);
    }

    fs.unlinkSync(destinationFilePathOfLog);
    fs.unlinkSync(filePath);

    next(index + 1);
  } catch (error) {
    console.error("Error occurred during backup:", error);
    sendMessage(type, group_chat_id, `Error occurred during backup: ${error}`);
  } finally {
    client.close();
  }
};

export { backupDatabase };
