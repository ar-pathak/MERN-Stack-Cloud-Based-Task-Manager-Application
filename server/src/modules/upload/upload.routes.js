const router = require("express").Router();
const upload = require("../../middleware/uploadMiddleware");
const controller = require("./upload.controller");
const auth = require("../../middleware/authMiddleware");

// Require login to upload files
router.use(auth);

// Single file upload -> field name "file"
router.post("/single", upload.single("file"), controller.uploadFile);

// Multiple files upload -> field name "files" (max 5)
router.post("/multiple", upload.array("files", 5), controller.uploadFile);

module.exports = router;