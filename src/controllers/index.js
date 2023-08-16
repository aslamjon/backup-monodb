const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const { isEmpty, get } = require("lodash");
const { spawn } = require("child_process");
const unzipper = require("unzipper");

const config = require("../config");

const { unlink, isProduction, rename, isFolder } = require("../utils/utiles");
const { backupDatabase } = require("./backupController");

const url = config.MONGODB_URL;

const readConfig = () => {
  let configJSON = fs.readFileSync(path.join(__dirname, "../../config.json"), { encoding: "ascii" });
  if (isEmpty(configJSON)) return {};
  configJSON = JSON.parse(configJSON);
  return configJSON;
};

const unzipHander = async ({ zipPath, outputFolderPath }) => {
  // Create a read stream from the zip file
  const readStream = fs.createReadStream(zipPath);

  return new Promise((resolve, reject) => {
    // Pipe the read stream to the unzipper module
    readStream
      .pipe(unzipper.Extract({ path: outputFolderPath }))
      .on("finish", resolve)
      .on("error", reject);
  });
};

const restoreMongodb = async ({ name, path, username, password }) => {
  try {
    const child = spawn(`mongorestore`, [
      `--db=${name}`,
      `--archive=${path}`,
      `--gzip`,
      `--authenticationDatabase`,
      `admin`,
      `--username`,
      username,
      `--password`,
      password,
    ]);

    child.stdout.on("data", (data) => {
      console.log("stdout", data);
    });
    child.stderr.on("data", (data) => {
      console.log("stderr", Buffer.from(data).toString());
    });

    return new Promise((resolve, reject) => {
      child.on("error", reject);

      child.on("exit", async (code, signal) => {
        if (code) reject(`Process exit with code: ${code}`);
        else if (signal) reject(`Process killed with signal: ${signal}`);
        else {
          resolve();
        }
      });
    });
  } catch (e) {}
};
// mongorestore --db=metalmart --archive=./rbac.gzip --gzip
// mongorestore --db=metalmart --archive=metalmart_production_backup.gzip --gzip --authenticationDatabase admin --username aslamjon --password TpYvzK2jAQy3TXR5576tVWWNJpSGNrKBkFF
const restoreDatabase = async (req, res) => {
  let client = {};
  try {
    const { name, username, password } = req.body;
    if (username !== "aslamjon" || password !== "25102000Aslamjon") return res.status(400).send({ error: "username or password is invalid" });

    const temp = {};
    req.files.forEach((item) => {
      temp[item.fieldname] = item;
    });

    if (!get(temp, "dbBackupFile")) return res.status(400).send({ error: "dbBackupFile should not be empty" });
    if (!get(temp, "folderBackupFile")) return res.status(400).send({ error: "folderBackupFile should not be empty" });

    const configJSON = readConfig();
    const dbConfig = get(configJSON, "dbs", []).find((db) => db.name === name);
    if (!dbConfig) return res.status(400).send({ error: "db not found" });

    let { db_username, db_password, folder_path, folder_path_dev } = dbConfig;
    if (!isProduction()) folder_path = folder_path_dev;

    client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      auth: {
        username: db_username,
        password: db_password,
      },
    });

    await client.connect();

    // Get the database
    const db = client.db(name);

    await db.dropDatabase();

    await restoreMongodb({ name, path: get(temp, "dbBackupFile.path"), username: db_username, password: db_password });

    console.log("database is restored. success ✅");

    // remove dbBackupfile
    await unlink(get(temp, "dbBackupFile.path"));

    const zipPath = config.CACHE_PATH + "/temp.zip";
    await rename(get(temp, "folderBackupFile.path"), zipPath);

    const outputFolderPath = config.CACHE_PATH + "/temp";

    await unzipHander({ zipPath, outputFolderPath });
    await unlink(zipPath);

    isFolder(folder_path) &&
      fs.rmSync(folder_path, { recursive: true }, (error) => {
        if (error) res.status(500).send(`Error removing folder: ${error}}`);
      });

    const result = await rename(outputFolderPath, folder_path);

    client.close();
    if (result) return res.send("Completed successufully ✅");
    return res.status(500).send("ERROR: it couldn't rename folder");
  } catch (error) {
    console.error("Error occurred during restore:", error);
    client.close();
  } finally {
  }
};

const init = async () => {
  const configJSON = readConfig();

  // const anonimId = "678719517";
  // const anonimUsername = "i_am_anonim";
  // const moneyGroupId = "-1001334940597";
  // const moneyGroupUsername = "moneybotb";
  // const backupGroupId = "-1001891769962";

  // const callback = (item) => {
  //   const client = new MongoClient(url, {
  //     useNewUrlParser: true,
  //     useUnifiedTopology: true,
  //     auth: {
  //       username: item.db_username,
  //       password: item.db_password,
  //     },
  //   });
  //   backupDatabase({ ...item, client });
  // };
  // get(configJSON, "dbs", []).forEach(callback);

  const next = (index = 0) => {
    if (get(configJSON, "dbs", []).length === index) return;
    const item = get(configJSON, "dbs", [])[index];
    const client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      auth: {
        username: item.db_username,
        password: item.db_password,
      },
    });
    backupDatabase({ ...item, client, next, index });
  };
  next();
};

module.exports = { init, restoreDatabase };
