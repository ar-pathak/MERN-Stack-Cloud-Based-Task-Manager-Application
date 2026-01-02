const express = require('express')
const AuthController = require('./auth.controller')

const router = express.Router()

router.post("/signup", AuthController.signUp);
router.post("/login", AuthController.logIn);
router.post("/logout", AuthController.logOut);
router.post("/refresh", AuthController.refresh);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password/:token", AuthController.resetPassword);


module.exports = router