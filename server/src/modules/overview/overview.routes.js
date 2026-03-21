const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const overviewController = require('./overview.controller')
const router = express.Router();

router.use(authMiddleware)

router.get('/activity', overviewController.activity);
router.post('/enrich-timeline', overviewController.enrichTimeline);


module.exports = router;
