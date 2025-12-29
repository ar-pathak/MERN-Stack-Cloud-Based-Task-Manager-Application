const express = require('express')
const AuthController = require('./auth.controller')

const router = express.Router()

router.post("/signup", AuthController.signUp);
router.post("/login", AuthController.logIn);
router.post("/logout", AuthController.logOut);


module.exports = router