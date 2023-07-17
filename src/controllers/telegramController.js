const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const config = require("../config");

const apiId = config.TELEGRAM_USER_API_ID * 1;
const apiHash = config.TELEGRAM_APIHASH;
const session = config.TELEGRAM_SESSION;
const stringSession = new StringSession(session);

const getPeerId = async (chatIdOrUserName) => {
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

const sendFileToChat = async (chatIdOrUserName, filePath, caption) => {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  try {
    await client.connect();
    if (await client.checkAuthorization()) {
      const result = await client.sendFile(chatIdOrUserName, {
        file: filePath,
        caption,
        ...(config.isProduction
          ? {}
          : {
              progressCallback: (process) => {
                console.log(`${(process * 100).toFixed(3)}% of 100%`);
              },
            }),
      });
      // console.log("Message details:", result);
    } else {
      console.log("I am connected to telegram servers but not logged in with any account/bot");
    }
  } catch (err) {
    console.error("Failed to send file:", err);
  } finally {
    await client.disconnect();
  }
};

const sendMessageToChat = async (chatIdOrUserName, message) => {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  try {
    await client.connect();
    if (await client.checkAuthorization()) {
      const result = await client.sendMessage(chatIdOrUserName, { message });
    } else {
      console.log("I am connected to telegram servers but not logged in with any account/bot");
    }
  } catch (err) {
    console.error("Failed to send message:", err);
  } finally {
    await client.disconnect();
  }
};

const editMessage = async (chatIdOrUserName, messageId, message) => {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  try {
    await client.connect();
    if (await client.checkAuthorization()) {
      const inputEntity = await client.getInputEntity(chatIdOrUserName);

      const result = await client.editMessage(inputEntity, messageId, { message });
    } else {
      console.log("I am connected to telegram servers but not logged in with any account/bot");
    }
  } catch (err) {
    console.error("Failed to send message:", err);
  } finally {
    await client.disconnect();
  }
};

module.exports = {
  sendFileToChat,
  sendMessageToChat,
  editMessage,
  getPeerId,
};
