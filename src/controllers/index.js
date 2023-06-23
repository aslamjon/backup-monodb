const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const { isEmpty, get } = require("lodash");
const { spawn } = require("child_process");
const archiver = require("archiver");
const unzipper = require("unzipper");

const config = require("../config");

const { bot } = require("../integration/telegram");
const { unlink, isProduction, rename, isFolder } = require("../utils/utiles");

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
// mongorestore --db=metalmart --archive=metalmart_production_backup.gzip --gzip --authenticationDatabase admin --username aslamjon --password TpYvzK2jAQy3TXR5576tVWWNJpSGNrKBkFF
const restoreDatabase = async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (username !== "aslamjon" || password !== "25102000Aslamjon") return res.status(400).send({ error: "username or password is invalid" });

    const temp = {};
    req.files.forEach((item) => {
      temp[item.fieldname] = item;
    });

    if (!get(temp, "dbBackupFile")) return res.status(400).send({ error: "dbBackupFile should not be empty" });
    if (!get(temp, "folderBackupFile")) return res.status(400).send({ error: "folderBackupFile should not be empty" });

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

const init = () => {
  const configJSON = readConfig();
  get(configJSON, "dbs", []).forEach(backupDatabase);
};

module.exports = { init, restoreDatabase };
