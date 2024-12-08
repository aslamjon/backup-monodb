import { MongoClient } from "mongodb";

interface IUnzipHandlerParams {
  zipPath: string;
  outputFolderPath: string;
}

interface IRestoreMongodbParams {
  name: string;
  path: string;
  username: string;
  password: string;
}

type TConfig = "test" | "production";

interface IBackupDatabaseParams {
  name: string;
  group_chat_id: string;
  folder_path: string;
  folder_path_dev: string;
  log_file_path: string;
  log_file_path_dev: string;
  client: MongoClient;
  next: (index: number) => void;
  index: number;
  type: TConfig;
}

export { IUnzipHandlerParams, IRestoreMongodbParams, IBackupDatabaseParams, TConfig };
