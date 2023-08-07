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

const unzipHander = ({ zipPath, outputFolderPath, cb = () => {}, fail = () => {} }) => {
  // Create a read stream from the zip file
  const readStream = fs.createReadStream(zipPath);

  // Pipe the read stream to the unzipper module
  readStream
    .pipe(unzipper.Extract({ path: outputFolderPath }))
    .on("finish", () => {
      // remove zipPath
      unlink(zipPath);
      cb();
    })
    .on("error", fail);
};

const afterUnzipCbHandler = async ({ name, outputFolderPath, fail = () => {}, success = () => {} }) => {
  const configJSON = readConfig();
  let { folder_path, folder_path_dev } = configJSON.dbs.find((item) => get(item, "name") === name);

  if (!isProduction()) folder_path = folder_path_dev;

  isFolder(folder_path) &&
    fs.rmSync(folder_path, { recursive: true }, (error) => {
      if (error) fail(`Error removing folder: ${error}}`);
    });

  const result = await rename(outputFolderPath, folder_path);

  if (result) return success("Completed successufully ✅");
  return res.status(500).send("ERROR: it couldn't rename folder");
};

// mongorestore --db=metalmart --archive=./rbac.gzip --gzip
// mongorestore --db=metalmart --archive=metalmart_production_backup.gzip --gzip --authenticationDatabase admin --username aslamjon --password TpYvzK2jAQy3TXR5576tVWWNJpSGNrKBkFF
const restoreDatabase = async (req, res) => {
  try {
    const { name, username, password, db_username, db_password } = req.body;
    if (username !== "aslamjon" || password !== "25102000Aslamjon") return res.status(400).send({ error: "username or password is invalid" });

    const temp = {};
    req.files.forEach((item) => {
      temp[item.fieldname] = item;
    });

    if (!get(temp, "dbBackupFile")) return res.status(400).send({ error: "dbBackupFile should not be empty" });
    if (!get(temp, "folderBackupFile")) return res.status(400).send({ error: "folderBackupFile should not be empty" });

    const client = new MongoClient(url, {
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

    const child = spawn(`mongorestore`, [
      `--db=${name}`,
      `--archive=${get(temp, "dbBackupFile.path")}`,
      `--gzip`,
      `--authenticationDatabase`,
      `admin`,
      `--username`,
      db_username,
      `--password`,
      db_password,
    ]);

    child.stdout.on("data", (data) => {
      console.log("stdout", data);
    });
    child.stderr.on("data", (data) => {
      console.log("stderr", Buffer.from(data).toString());
    });
    child.on("error", (error) => {
      res.status(500).send(`error: ${error}`);
    });
    child.on("exit", async (code, signal) => {
      if (code) {
        res.status(500).send(`Process exit with code: ${code}`);
      } else if (signal) {
        res.status(500).send(`Process killed with signal: ${signal}`);
      } else {
        console.log("success ✅");

        // remove dbBackupfile
        unlink(get(temp, "dbBackupFile.path"));

        const zipPath = config.CACHE_PATH + "/temp.zip";
        await rename(get(temp, "folderBackupFile.path"), zipPath);

        const outputFolderPath = config.CACHE_PATH + "/temp";

        unzipHander({
          zipPath: zipPath,
          outputFolderPath,
          cb: () => afterUnzipCbHandler({ name, outputFolderPath, fail: (e) => res.status(500).send(e), success: (s) => res.send(s) }),
          fail: (err) => res.status(500).send(`Error occurred during extraction: ${err}`),
        });
      }
    });
  } catch (error) {
    console.error("Error occurred during restore:", error);
  } finally {
    client.close();
  }
};

const init = async () => {
  const configJSON = readConfig();

  // const anonimId = "678719517";
  // const anonimUsername = "i_am_anonim";
  // const moneyGroupId = "-1001334940597";
  // const moneyGroupUsername = "moneybotb";
  // const backupGroupId = "-1001891769962";

  const callback = (item) => {
    const client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      auth: {
        username: item.db_username,
        password: item.db_password,
      },
    });
    backupDatabase({ ...item, client });
  };
  get(configJSON, "dbs", []).forEach(callback);
};

module.exports = { init, restoreDatabase };
