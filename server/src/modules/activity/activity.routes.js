const router = require("express").Router();
const auth = require("../../middleware/authMiddleware");
const { validate } = require("../../middleware/validate");
const controller = require("./activity.controller");
const validation = require("./activity.validation");

router.use(auth);

router.get(
    "/dashboard",
    validate(validation.dashboardQuerySchema, "query"),
    controller.getMyActivityDashboard
);

router.get(
    "/me",
    validate(validation.listActivityQuerySchema, "query"),
    controller.listMyActivities
);

module.exports = router;
