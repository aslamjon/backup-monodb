import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { isEmpty, get } from "lodash";
import { spawn } from "child_process";
import unzipper from "unzipper";
import { Request, Response } from "express";

import { unlink, rename, isFolder } from "../utils/utiles";
import { backupDatabase } from "./backupController";
import { API_ROOT_TEST, CACHE_PATH, isProduction, MONGODB_URL, ROOT_PASSWORD, ROOT_USERNAME } from "../config";
import { IRestoreMongodbParams, IUnzipHandlerParams } from "../interface";
import axios from "axios";

const readConfig = () => {
  let configJSON = fs.readFileSync(path.join(__dirname, "../../config.json"), { encoding: "ascii" });
  if (isEmpty(configJSON)) return {};
  configJSON = JSON.parse(configJSON);
  return configJSON;
};

const unzipHandler = async ({ zipPath, outputFolderPath }: IUnzipHandlerParams) => {
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

const restoreMongodb = async ({ name, path, username, password }: IRestoreMongodbParams) => {
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
    child.stderr.on("data", (_data) => {
      // console.log("stderr", Buffer.from(data).toString());
    });

    return new Promise((resolve, reject) => {
      child.on("error", reject);

      child.on("exit", async (code, signal) => {
        if (code) reject(`Process exit with code: ${code}`);
        else if (signal) reject(`Process killed with signal: ${signal}`);
        else resolve("");
      });
    });
  } catch (e) {}
};

const restoreDatabase = async (req: Request & { files: any[] }, res: Response): Promise<void> => {
  let client: MongoClient;
  try {
    const { name, username, password } = req.body;
    if (username !== ROOT_USERNAME || password !== ROOT_PASSWORD) return res.status(400).send({ error: "username or password is invalid" }), null;

    const temp = {};
    req.files.forEach((item) => {
      temp[item.fieldname] = item;
    });

    const configJSON = readConfig();
    const dbConfig = get(configJSON, "dbs", []).find((db) => db.name === name);
    if (!dbConfig) return res.status(400).send({ error: "db not found" }), null;

    let { db_username, db_password, folder_path, folder_path_dev } = dbConfig;
    if (!isProduction) folder_path = folder_path_dev;

    if (!get(temp, "dbBackupFile")) return res.status(400).send({ error: "dbBackupFile should not be empty" }), null;
    if (!get(temp, "folderBackupFile") && folder_path) return res.status(400).send({ error: "folderBackupFile should not be empty" }), null;

    client = new MongoClient(MONGODB_URL, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
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

    const outputFolderPath = CACHE_PATH + "/temp";

    if (get(temp, "folderBackupFile.path")) {
      const zipPath = CACHE_PATH + "/temp.zip";
      await rename(get(temp, "folderBackupFile.path"), zipPath);

      await unzipHandler({ zipPath, outputFolderPath });
      await unlink(zipPath);
    }

    if (folder_path) {
      isFolder(folder_path) && fs.rmSync(folder_path, { recursive: true });

      const result = await rename(outputFolderPath, folder_path);
      client.close();
      if (result) return res.send("Completed successufully ✅: Folder is renamed"), null;
    }

    client.close();
    return res.send("Completed successufully ✅"), null;
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

  const next = async (index = 0) => {
    if (get(configJSON, "dbs", []).length === index) return;
    const item = get(configJSON, "dbs", [])[index];
    const client = new MongoClient(MONGODB_URL, {
      auth: {
        username: item.db_username,
        password: item.db_password,
      },
    });
    await backupDatabase({ ...item, client, next, index });
  };
  await next();

  axios.get(`${API_ROOT_TEST}/api/rebackup`);
};

export { init, restoreDatabase };
