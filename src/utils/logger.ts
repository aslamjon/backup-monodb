import { createLogger, transports, format } from "winston";
import { formatDate } from "./utiles";

const customFormat = format.combine(
  format.timestamp(),
  format.printf((info) => {
    return `${formatDate("MM-dd-yyyy HH:mm:ss", new Date(info.timestamp))} - ${info.level.toUpperCase().padEnd(7)} - ${info.message}`;
  })
);

const logger = createLogger({
  format: customFormat,
  transports: [new transports.Console(), new transports.File({ filename: "app.log" })],
});

export default logger;
