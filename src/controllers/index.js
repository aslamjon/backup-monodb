const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const { isEmpty, get } = require("lodash");
const { spawn } = require("child_process");
const archiver = require("archiver");
const config = require("../config");

const { bot } = require("../integration/telegram");
const { unlink, isProduction } = require("../utils/utiles");

const url = config.MONGODB_URL;

const nodeEnv = process.env.NODE_ENV || "development";

const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  auth: {
    username: config.MONGO_USER,
    password: config.MONGO_PASSWORD,
  },
});

const readConfig = () => {
  let configJSON = fs.readFileSync(path.join(__dirname, "../../config.json"), { encoding: "ascii" });
  if (isEmpty(configJSON)) return {};
  configJSON = JSON.parse(configJSON);
  return configJSON;
};

const backupDatabase = async ({ name, group_chat_id, folder_path, folder_path_dev }) => {
  try {
    if (!isProduction()) folder_path = folder_path_dev;

    await client.connect();

    const adminDb = client.db("admin");
    const databases = await adminDb.admin().listDatabases();
    const dbFound = databases.databases.find((item) => item.name === name);

    if (isEmpty(dbFound)) return;

    const filePath = `${config.CACHE_PATH}/${name}_${nodeEnv}_backup.gzip`;

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
      console.log("stderr", Buffer.from(data).toString());
    });
    child.on("error", (error) => {
      console.log("error", error);
    });
    child.on("exit", (code, signal) => {
      if (code) console.log("Process exit with code:", code);
      else if (signal) console.log("Process killed with signal:", signal);
      else {
        console.log("success ✅");
        const folderPath = folder_path;
        const outputFilePath = `${config.CACHE_PATH}/${name}_${nodeEnv}_backup_folder.zip`;

        const output = fs.createWriteStream(outputFilePath);
        const archive = archiver("zip", {
          zlib: { level: 9 },
        });
        output.on("close", () => {
          bot
            .sendDocument(group_chat_id, filePath)
            .then(() => {
              unlink(filePath);
            })
            .catch((error) => {
              console.error("Error sending gzip files:", error);
            });
          bot
            .sendDocument(group_chat_id, outputFilePath)
            .then(() => {
              unlink(outputFilePath);
            })
            .catch((error) => {
              console.error("Error sending zip files:", error);
            });

          // bot.sendDocument(group_chat_id, filePath).then((r) => {
          //   unlink(filePath);
          // });
        });

        archive.on("error", (err) => {
          throw err;
        });

        archive.pipe(output);

        // Append the folder to the archive
        archive.directory(folderPath, false); // The second parameter 'false' ensures that the folder structure is not included

        // Finalize the archive
        archive.finalize();
      }
    });
  } catch (error) {
    console.error("Error occurred during backup:", error);
  } finally {
    client.close();
  }
};

// mongorestore --db=metalmart --archive=./rbac.gzip --gzip
const restoreDatabase = async (name) => {
  try {
  } catch (error) {
    console.error("Error occurred during restore:", error);
  } finally {
    client.close();
  }
};

const init = () => {
  const configJSON = readConfig();
  get(configJSON, "dbs", []).forEach(backupDatabase);
};

module.exports = { init };
