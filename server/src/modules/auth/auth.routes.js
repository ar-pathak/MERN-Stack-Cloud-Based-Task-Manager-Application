const express = require('express')
const AuthController = require('./auth.controller')

const router = express.Router()

router.post("/signup", AuthController.signUp);


module.exports = router