const { Router } = require("express");
const multer = require("multer");
const config = require("../config");
const { init, restoreDatabase } = require("../controllers");

const router = Router();

// you might also want to set some limits: https://github.com/expressjs/multer#limits
const upload = multer({
  dest: config.CACHE_PATH,
});
/* name attribute of <file> element in your form */
const nameOfFileFromFrontend = upload.any();

router.get("/rebackup", (req, res) => {
  init();
  res.send("success ✅");
});

router.post("/restore", nameOfFileFromFrontend, restoreDatabase);

module.exports = router;
