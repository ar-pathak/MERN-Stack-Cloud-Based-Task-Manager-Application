const router = require("express").Router();
const adminAuthMiddleware = require("../../middleware/adminAuthMiddleware");
const controller = require("./adminAuth.controller");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/verify-login-otp", controller.verifyLoginOtp);
router.post("/logout", controller.logout);
router.get("/me", adminAuthMiddleware, controller.me);
router.post("/forgot-password", controller.forgotPassword);
router.post("/request-verification", controller.requestVerificationByEmail);
router.post("/reset-password/:token", controller.resetPassword);
router.post("/send-verification", adminAuthMiddleware, controller.sendVerificationEmail);
router.post("/verify-email", controller.verifyEmail);
router.get("/verify-email/:token", controller.verifyEmail);

module.exports = router;
