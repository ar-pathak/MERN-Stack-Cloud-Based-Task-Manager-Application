const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const { validate } = require("../../middleware/validate");
const storyController = require("./story.controller");
const {
    createStorySchema,
    storyIdParamSchema,
    userIdParamSchema,
    storyReactionSchema
} = require("./story.validation");

router.use(authMiddleware);

router.get("/feed", storyController.getFeedStories);

router.get(
    "/user/:userId",
    validate(userIdParamSchema, "params"),
    storyController.getUserStories
);

router.post(
    "/",
    validate(createStorySchema),
    storyController.createStory
);

router.get(
    "/:id",
    validate(storyIdParamSchema, "params"),
    storyController.getStoryById
);

router.post(
    "/:id/view",
    validate(storyIdParamSchema, "params"),
    storyController.markViewed
);

router.post(
    "/:id/react",
    validate(storyIdParamSchema, "params"),
    validate(storyReactionSchema),
    storyController.reactToStory
);

router.delete(
    "/:id",
    validate(storyIdParamSchema, "params"),
    storyController.deleteStory
);

module.exports = router;

