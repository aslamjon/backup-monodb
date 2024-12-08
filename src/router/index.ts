import { Router } from "express";
import multer from "multer";
import { init, restoreDatabase } from "../controllers";
import { CACHE_PATH } from "../config";
import { sendFileWithBot, sendFileWithUser } from "../controllers/sendFileController";

const router = Router();

// you might also want to set some limits: https://github.com/expressjs/multer#limits
const upload = multer({
  dest: CACHE_PATH,
});
/* name attribute of <file> element in your form */
const nameOfFileFromFrontend = upload.any();

router.get("/rebackup", (_req, res) => {
  init();
  res.send("success ✅");
});

router.post("/restore", nameOfFileFromFrontend, restoreDatabase);
router.post("/send-file-with-bot/:chatId", nameOfFileFromFrontend, sendFileWithBot);
router.post("/send-file-with-user/:chatId", nameOfFileFromFrontend, sendFileWithUser);

export default router;
