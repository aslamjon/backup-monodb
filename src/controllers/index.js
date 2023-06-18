const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { isEmpty, get } = require("lodash");
const { spawn } = require("child_process");
const { bot } = require("../integration/telegram");
const { unlink } = require("../utils/utiles");

const url = config.MONGODB_URL;

const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

const readConfig = () => {
  let configJSON = fs.readFileSync(path.join(__dirname, "../../config.json"), { encoding: "ascii" });
  if (isEmpty(configJSON)) return {};
  configJSON = JSON.parse(configJSON);
  return configJSON;
};

const backupDatabase = async ({ name, group_chat_id }) => {
  try {
    await client.connect();

    const adminDb = client.db("admin");
    const databases = await adminDb.admin().listDatabases();
    const dbFound = databases.databases.find((item) => item.name === name);

    if (isEmpty(dbFound)) return;

    const filePath = `${config.CACHE_PATH}/${name}_backup.gzip`;

    const child = spawn(`mongodump`, [`--db=${name}`, `--archive=${filePath}`, `--gzip`]);

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
        console.log("success");
        bot.sendDocument(group_chat_id, filePath).then((r) => {
          unlink(filePath);
        });
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
  get(configJSON, "nameOfDbs", []).forEach(backupDatabase);
};

module.exports = { init };
