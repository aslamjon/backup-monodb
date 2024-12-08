import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { get } from "lodash";
import fs from "fs";
import { isProduction, TELEGRAM_API_HASH, TELEGRAM_SESSION, TELEGRAM_USER_API_ID } from "../config";

const apiId = Number(TELEGRAM_USER_API_ID);
const apiHash = TELEGRAM_API_HASH;
const session = TELEGRAM_SESSION;
const stringSession = new StringSession(session);

const getPeerId = async (chatIdOrUserName: string) => {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  try {
    await client.connect();
    if (await client.checkAuthorization()) {
      const id = await client.getPeerId(chatIdOrUserName);
      console.log(typeof id, id);
      return id;
    } else {
      console.log("I am connected to telegram servers but not logged in with any account/bot");
    }
  } catch (err) {}
};

const sendFileToChat = async (chatIdOrUserName: string, filePath: string, caption: string) => {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  try {
    await client.connect();
    if (await client.checkAuthorization()) {
      const messageResult = await client.sendMessage(chatIdOrUserName, { message: "0% of 100%" });

      const fileSize = fs.statSync(filePath);
      const fileSizeInBytes = fileSize.size;
      const fileSizeInKilobytes = fileSizeInBytes / 1024;
      const fileSizeInMegabytes = fileSizeInKilobytes / 1024;

      await client.sendFile(chatIdOrUserName, {
        file: filePath,
        caption,
        progressCallback: (process) => {
          !isProduction && console.log(`${(process * 100).toFixed(3)}% of 100% - ${caption}`);

          if (Number((process * 100).toFixed(0)) % 2 === 0) {
            const uploaded = (fileSizeInBytes * (process * 100)) / 100;
            const uploadedKilobytes = uploaded / 1024;
            const uploadedMegabytes = uploadedKilobytes / 1024;
            client.editMessage(chatIdOrUserName, {
              message: get(messageResult, "id"),
              text: `#${caption}\n${(process * 100).toFixed(3)}% of 100%.\n\nUploaded ${uploadedKilobytes.toFixed(
                1
              )} of ${fileSizeInKilobytes.toFixed(1)} KB\nUploaded ${uploadedMegabytes.toFixed(1)} of ${fileSizeInMegabytes.toFixed(1)} MB`,
            });
          }
        },
      });

      setTimeout(() => client.deleteMessages(chatIdOrUserName, [get(messageResult, "id")], { revoke: true }), 10000);

      // console.log("Message details:", result);
    } else {
      console.log("I am connected to telegram servers but not logged in with any account/bot");
    }
  } catch (err) {
    console.error("Failed to send file:", err);
  } finally {
    // await client.disconnect();
    setTimeout(() => client.disconnect(), 11000);
  }
};

const sendMessageToChat = async (chatIdOrUserName: string, message: string) => {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  try {
    await client.connect();
    if (await client.checkAuthorization()) {
      await client.sendMessage(chatIdOrUserName, { message });
    } else {
      console.log("I am connected to telegram servers but not logged in with any account/bot");
    }
  } catch (err) {
    console.error("Failed to send message:", err);
  } finally {
    await client.disconnect();
  }
};

const editMessage = async (chatIdOrUserName: string, messageId: number, message: string) => {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  try {
    await client.connect();
    if (await client.checkAuthorization()) {
      const inputEntity = await client.getInputEntity(chatIdOrUserName);

      await client.editMessage(inputEntity, { message: messageId, text: message });
    } else {
      console.log("I am connected to telegram servers but not logged in with any account/bot");
    }
  } catch (err) {
    console.error("Failed to send message:", err);
  } finally {
    await client.disconnect();
  }
};

export { sendFileToChat, sendMessageToChat, editMessage, getPeerId };
