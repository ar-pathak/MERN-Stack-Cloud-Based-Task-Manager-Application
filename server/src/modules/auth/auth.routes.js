const express = require('express')
const AuthController = require('./auth.controller')
const optionalAuthMiddleware = require('../../middleware/optionalAuthMiddleware');
const authMiddleware = require('../../middleware/authMiddleware');

const router = express.Router()

router.post("/signup", AuthController.signUp);
router.post("/login", AuthController.logIn);
router.post("/logout", optionalAuthMiddleware, AuthController.logOut);
router.post("/refresh", AuthController.refresh);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password/:token", AuthController.resetPassword);
router.post("/send-verification", authMiddleware, AuthController.sendVerificationEmail);
router.post("/verify-email", AuthController.verifyEmail);
router.get("/verify-email/:token", AuthController.verifyEmail);


module.exports = router
