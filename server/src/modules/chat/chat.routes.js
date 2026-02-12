
const router = require("express").Router();
const auth = require("../../middleware/authMiddleware");
const { validate } = require("../../middleware/validate");
const controller = require("./chat.controller");
const v = require("./chat.validation");

// Every route in this file requires authentication
router.use(auth);

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------
router.post("/private", validate(v.privateChatSchema), controller.createPrivateChat);
router.post("/group", validate(v.groupChatSchema), controller.createGroupChat);
router.get("/", controller.getChats);
router.get(
    "/exists/:targetUserId",
    controller.checkPrivateChat
);

// Group management
router.patch(
    "/:chatId",
    validate(v.chatIdParamSchema, "params"),
    validate(v.updateGroupSchema),
    controller.updateGroupChat
);

router.post(
    "/:chatId/members",
    validate(v.chatIdParamSchema, "params"),
    validate(v.addMembersSchema),
    controller.addMembers
);

router.delete(
    "/:chatId/members",
    validate(v.chatIdParamSchema, "params"),
    validate(v.removeMemberSchema),
    controller.removeMember
);

router.post(
    "/:chatId/leave",
    validate(v.chatIdParamSchema, "params"),
    controller.leaveGroup
);

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
router.get(
    "/mentions/unread",
    validate(v.mentionSummarySchema, "query"),
    controller.getUnreadMentionSummary
);

router.get(
    "/:chatId/messages",
    validate(v.chatIdParamSchema, "params"),
    validate(v.paginationSchema, "query"),
    controller.getMessages
);

router.post("/message", validate(v.sendMessageSchema), controller.sendMessage);

// Message search
router.get(
    "/:chatId/messages/search",
    validate(v.chatIdParamSchema, "params"),
    validate(v.searchSchema, "query"),
    controller.searchMessages
);

// Message actions
router.patch(
    "/message/:messageId/pin",
    validate(v.messageIdParamSchema, "params"),
    validate(v.messageActionSchema),
    controller.togglePinMessage
);

router.delete(
    "/message/:messageId",
    validate(v.messageIdParamSchema, "params"),
    validate(v.messageActionSchema),
    controller.deleteMessage
);

router.patch(
    "/message/:messageId",
    validate(v.messageIdParamSchema, "params"),
    validate(v.editMessageSchema),
    controller.editMessage
);

// Reactions
router.post(
    "/message/:messageId/reaction",
    validate(v.messageIdParamSchema, "params"),
    validate(v.reactionSchema),
    controller.addReaction
);

router.delete(
    "/message/:messageId/reaction",
    validate(v.messageIdParamSchema, "params"),
    validate(v.reactionSchema),
    controller.removeReaction
);

module.exports = router;
