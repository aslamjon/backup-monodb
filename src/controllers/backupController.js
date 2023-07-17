const archiver = require("archiver");
const fs = require("fs");
const { isEmpty } = require("lodash");
const { spawn } = require("child_process");

const { unlink, isProduction } = require("../utils/utiles");
const config = require("../config");
const { bot } = require("../integration/telegram");
const { sendFileToChat } = require("./telegramController");

const nodeEnv = process.env.NODE_ENV || "development";

const dumpFromDatabase = ({ name, filePath }, cb = () => {}) => {
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

  child.stdout.on("data", (data) => {
    console.log("stdout", data);
  });
  child.stderr.on("data", (data) => {
    // show dumping process
    // console.log("stderr", Buffer.from(data).toString());
  });
  child.on("error", (error) => {
    console.log("error", error);
  });
  child.on("exit", (code, signal) => {
    if (code) console.log("Process exit with code:", code);
    else if (signal) console.log("Process killed with signal:", signal);
    else cb();
  });
};

const archiveFolder = ({ name, folder_path }, cb = () => {}) => {
  const outputFilePath = `${config.CACHE_PATH}/${name}_${nodeEnv}_backup_folder.zip`;

  const output = fs.createWriteStream(outputFilePath);
  const archive = archiver("zip", {
    zlib: { level: 9 },
  });
  output.on("close", () => {
    cb(outputFilePath);
  });

  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(output);

  // Append the folder to the archive
  archive.directory(folder_path, false); // The second parameter 'false' ensures that the folder structure is not included

  // Finalize the archive
  archive.finalize();
};

const sendFileWithTelegramBot = (chat_id, filePath, fileType) => {
  bot
    .sendDocument(chat_id, filePath)
    .then(() => {
      // unlink(filePath);
    })
    .catch((error) => {
      bot.sendMessage(
        chat_id,
        `ERROR: ${error.message}.\nStatusCode: ${error.response.statusCode}. \nCould not send ${fileType} file.\npath: ${filePath}`
      );
      // console.error(`Error sending ${fileType} files:`, error);
    });
};

const backupDatabase = async ({ name, group_chat_id, folder_path, folder_path_dev, client }) => {
  try {
    if (!isProduction()) folder_path = folder_path_dev;

    await client.connect();

    const adminDb = client.db("admin");
    const databases = await adminDb.admin().listDatabases();
    const dbFound = databases.databases.find((item) => item.name === name);

    if (isEmpty(dbFound)) return;

    const filePath = `${config.CACHE_PATH}/${name}_${nodeEnv}_backup.gzip`;

    const dumpedDatabaseCallback = () => {
      // console.log("dumped successfully ✅");
      sendFileWithTelegramBot(group_chat_id, filePath, "gzip");

      archiveFolder({ name, folder_path }, (outputFilePath) => {
        // sendFileWithTelegramBot(group_chat_id, outputFilePath, "zip");
        sendFileToChat(group_chat_id, outputFilePath);
      });
    };

    dumpFromDatabase({ name, filePath }, dumpedDatabaseCallback);
  } catch (error) {
    console.error("Error occurred during backup:", error);
  } finally {
    client.close();
  }
};

module.exports = {
  backupDatabase,
};
