const fs = require("fs");
const { errors } = require("./constants");
const { isString, get, isArray } = require("lodash");

const writeData = (filename, content) => {
  fs.writeFile(filename, JSON.stringify(content, null, 4), "utf8", (err) => {
    if (err) console.log(err);
  });
};

const createDefaultFolder = (dirName) => !fs.existsSync(dirName) && fs.mkdirSync(dirName, { recursive: true });

function rename(previousName, newName) {
  return new Promise((resolve, reject) => {
    fs.rename(previousName, newName, (err) => {
      if (err) resolve(0);
      resolve(1);
    });
  });
}
function unlink(tempPath) {
  return new Promise((resolve, reject) => {
    fs.unlink(tempPath, (err) => {
      if (err) resolve(0);
      resolve(1);
    });
  });
}
// ************************- encoding and decoding -********************************
const encodingBase64 = (filePath) => {
  const file = fs.readFileSync(filePath, { encoding: "base64" });
  // return file.toString('base64');
  return file;
};

const decodingBase64 = (data, fileName) => {
  let buff = new Buffer.from(data, "base64");
  fs.writeFileSync(fileName, buff);
};
// **********************************- date format -************************************************

function formatDate(format, date = new Date(), utc) {
  // const map = {
  //     mm: date.getMonth() + 1,
  //     dd: date.getDate(),
  //     yy: date.getFullYear().toString().slice(-2),
  //     yyyy: date.getFullYear()
  // }
  // return format.replace(/mm|dd|yyyy|yy/gi, matched => map[matched])
  // return date.toLocaleDateString("en-US");
  let MMMM = ["\x00", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let MMM = ["\x01", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let dddd = ["\x02", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let ddd = ["\x03", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function ii(i, len) {
    let s = i + "";
    len = len || 2;
    while (s.length < len) s = "0" + s;
    return s;
  }

  let y = utc ? date.getUTCFullYear() : date.getFullYear();
  format = format.replace(/(^|[^\\])yyyy+/g, "$1" + y);
  format = format.replace(/(^|[^\\])yy/g, "$1" + y.toString().substr(2, 2));
  format = format.replace(/(^|[^\\])y/g, "$1" + y);

  let M = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
  format = format.replace(/(^|[^\\])MMMM+/g, "$1" + MMMM[0]);
  format = format.replace(/(^|[^\\])MMM/g, "$1" + MMM[0]);
  format = format.replace(/(^|[^\\])MM/g, "$1" + ii(M));
  format = format.replace(/(^|[^\\])M/g, "$1" + M);

  let d = utc ? date.getUTCDate() : date.getDate();
  format = format.replace(/(^|[^\\])dddd+/g, "$1" + dddd[0]);
  format = format.replace(/(^|[^\\])ddd/g, "$1" + ddd[0]);
  format = format.replace(/(^|[^\\])dd/g, "$1" + ii(d));
  format = format.replace(/(^|[^\\])d/g, "$1" + d);

  let H = utc ? date.getUTCHours() : date.getHours();
  format = format.replace(/(^|[^\\])HH+/g, "$1" + ii(H));
  format = format.replace(/(^|[^\\])H/g, "$1" + H);

  let h = H > 12 ? H - 12 : H == 0 ? 12 : H;
  format = format.replace(/(^|[^\\])hh+/g, "$1" + ii(h));
  format = format.replace(/(^|[^\\])h/g, "$1" + h);

  let m = utc ? date.getUTCMinutes() : date.getMinutes();
  format = format.replace(/(^|[^\\])mm+/g, "$1" + ii(m));
  format = format.replace(/(^|[^\\])m/g, "$1" + m);

  let s = utc ? date.getUTCSeconds() : date.getSeconds();
  format = format.replace(/(^|[^\\])ss+/g, "$1" + ii(s));
  format = format.replace(/(^|[^\\])s/g, "$1" + s);

  let f = utc ? date.getUTCMilliseconds() : date.getMilliseconds();
  format = format.replace(/(^|[^\\])fff+/g, "$1" + ii(f, 3));
  f = Math.round(f / 10);
  format = format.replace(/(^|[^\\])ff/g, "$1" + ii(f));
  f = Math.round(f / 10);
  format = format.replace(/(^|[^\\])f/g, "$1" + f);

  let T = H < 12 ? "AM" : "PM";
  format = format.replace(/(^|[^\\])TT+/g, "$1" + T);
  format = format.replace(/(^|[^\\])T/g, "$1" + T.charAt(0));

  let t = T.toLowerCase();
  format = format.replace(/(^|[^\\])tt+/g, "$1" + t);
  format = format.replace(/(^|[^\\])t/g, "$1" + t.charAt(0));

  let tz = -date.getTimezoneOffset();
  let K = utc || !tz ? "Z" : tz > 0 ? "+" : "-";
  if (!utc) {
    tz = Math.abs(tz);
    let tzHrs = Math.floor(tz / 60);
    let tzMin = tz % 60;
    K += ii(tzHrs) + ":" + ii(tzMin);
  }
  format = format.replace(/(^|[^\\])K/g, "$1" + K);

  let day = (utc ? date.getUTCDay() : date.getDay()) + 1;
  format = format.replace(new RegExp(dddd[0], "g"), dddd[day]);
  format = format.replace(new RegExp(ddd[0], "g"), ddd[day]);

  format = format.replace(new RegExp(MMMM[0], "g"), MMMM[M]);
  format = format.replace(new RegExp(MMM[0], "g"), MMM[M]);

  format = format.replace(/\\(.)/g, "$1");

  return format;
}

const ISODate = (date = new Date()) => date.toISOString();

function setYear(year, date = new Date()) {
  let Year = new Date().setFullYear(year);
  return new Date(Year);
}

function getTime(format = 24, date = new Date()) {
  if (format == 24) return date.toUTCString().split(" ")[4];
  else return date.toLocaleString().split(" ")[1];
}

// ********************************************************

const isInt = (n) => Number(n) === n && n % 1 === 0;

const isFloat = (n) => Number(n) === n && n % 1 !== 0;

const toFixed = (number, n = 2) => Number(Number(number).toFixed(n));

const errorHandling = (e, functionName, res, fileName) => {
  require("./logger").error(`${e.message} -> ${fileName} -> ${functionName} -> \n\n ${e.stack}`);
  errors.SERVER_ERROR(res, { message: e.message });
};

const errorHandlerBot = (e, functionName, fileName) => require("./logger").error(`${e.message} -> ${fileName} -> ${functionName} -> \n\n ${e.stack}`);

const smsCodeGenerator = () => {
  let code = Math.floor(Math.random() * 1000000);
  if (code < 100000) return smsCodeGenerator();
  return code;
};

const isNum = (num) => {
  num = `${num}`;
  let newNum = parseInt(num);
  if (isNaN(newNum)) return false;
  else if (newNum.toString() === num) return true;
  return false;
};

const isFile = (path) => fs.existsSync(path) && fs.lstatSync(path).isFile();

const isProduction = () => {
  const env = process.env.NODE_ENV || "development";
  const isProduction = env === "production";
  return isProduction;
};

// ********************************************************
module.exports = {
  writeData,
  rename,
  unlink,
  errorHandling,
  isInt,
  isFloat,
  toFixed,
  encodingBase64,
  decodingBase64,
  formatDate,
  ISODate,
  setYear,
  getTime,
  smsCodeGenerator,
  errorHandlerBot,
  isNum,
  createDefaultFolder,
  isFile,
  isProduction,
};
