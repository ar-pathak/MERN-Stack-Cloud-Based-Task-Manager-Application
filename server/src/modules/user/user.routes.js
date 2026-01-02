const express = require('express')
const authMiddleware = require('../../middleware/authMiddleware')
const userController = require('./user.controller')
const router = express.Router()


router.use(authMiddleware);

router.get('/userInfo', userController.gerUserInfo)


module.exports = router;