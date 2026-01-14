const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const overviewController = require('./overview.controller')
const router = express.Router();

router.use(authMiddleware)

router.get('/activity', overviewController.activity);


module.exports = router;
