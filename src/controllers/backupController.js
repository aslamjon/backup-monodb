const archiver = require("archiver");
const fs = require("fs");
const { isEmpty } = require("lodash");
const { spawn } = require("child_process");

const { isProduction, copyFileAsync } = require("../utils/utiles");
const config = require("../config");
const { bot } = require("../integration/telegram");
const { sendFileToChat } = require("./telegramController");
const moment = require("moment");

const nodeEnv = process.env.NODE_ENV || "development";

const dumpFromDatabase = async ({ name, filePath }) => {
  const child = spawn(`mongodump`, [
    `--db=${name}`,
    `--archive=${filePath}`,
    `--gzip`,
    `--authenticationDatabase`,
    `admin`,
    `--username`,
    config.MONGO_USER,
    `--password`,
    config.MONGO_PASSWORD,
  ]);

  return new Promise((resolve, reject) => {
    child.stdout.on("data", (data) => {
      console.log("stdout", data);
    });
    child.stderr.on("data", (data) => {
      // show dumping process
      // console.log("stderr", Buffer.from(data).toString());
    });
    child.on("error", reject);
    child.on("exit", resolve);
  });
};

const archiveFolder = async ({ name, folder_path }) => {
  const date = moment().format("DD_MM_YYYY_HH_mm");

  const outputFilePath = `${config.CACHE_PATH}/${name}_${nodeEnv}_${date}_backup_folder.zip`;

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

const sendFileWithTelegramBot = async (chat_id, filePath, fileType) => {
  try {
    await bot.sendDocument(chat_id, filePath);
    // unlink(filePath);
  } catch (error) {
    bot.sendMessage(
      chat_id,
      `ERROR: ${error.message}.\nStatusCode: ${error.response.statusCode}. \nCould not send ${fileType} file.\npath: ${filePath}`
    );
    // console.error(`Error sending ${fileType} files:`, error);
  }
};

const backupDatabase = async ({ name, group_chat_id, folder_path, folder_path_dev, log_file_path, log_file_path_dev, client, next, index, type }) => {
  try {
    if (type === "test") return next(index + 1);

    if (!isProduction()) {
      folder_path = folder_path_dev;
      log_file_path = log_file_path_dev;
    }

    await client.connect();

    const adminDb = client.db("admin");
    const databases = await adminDb.admin().listDatabases();
    const dbFound = databases.databases.find((item) => item.name === name);

    const date = moment().format("DD_MM_YYYY_HH_mm");

    if (isEmpty(dbFound)) return;

    const filePath = `${config.CACHE_PATH}/${name}_${nodeEnv}_${date}_backup.gzip`;

    await dumpFromDatabase({ name, filePath });

    await sendFileWithTelegramBot(group_chat_id, filePath, "gzip");
    const destinationFilePathOfLog = `${config.CACHE_PATH}/${name}_${nodeEnv}_${date}_backup_logFile.log`;

    await copyFileAsync(log_file_path, destinationFilePathOfLog);

    await sendFileWithTelegramBot(group_chat_id, destinationFilePathOfLog, "log");

    if (folder_path) {
      const outputFilePath = await archiveFolder({ name, folder_path });
      // sendFileWithTelegramBot(group_chat_id, outputFilePath, "zip");
      await sendFileToChat(group_chat_id, outputFilePath, name);

      fs.unlinkSync(outputFilePath);
    }

    fs.unlinkSync(destinationFilePathOfLog);
    fs.unlinkSync(filePath);

    next(index + 1);
  } catch (error) {
    console.error("Error occurred during backup:", error);
  } finally {
    client.close();
  }
};

module.exports = {
  backupDatabase,
};
