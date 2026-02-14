const Story = require("../../models/story");
const User = require("../../models/user");
const Follow = require("../../models/follow");
const {
    resolveMentionUsersFromText,
    notifyMentionedUsers,
    getMentionSnippet
} = require("../utils/mentionService");

const HOURS_24_IN_MS = 24 * 60 * 60 * 1000;
const STORY_HASHTAG_REGEX = /#(\w+)/g;

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const toIdString = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);

    // Handle raw ObjectId first to avoid `_id` self-getter recursion.
    if (typeof value?.toHexString === "function") {
        return value.toHexString();
    }

    if (typeof value === "object" && typeof value.id === "string") {
        return value.id;
    }

    if (typeof value === "object" && value._id && value._id !== value) {
        return toIdString(value._id);
    }

    if (typeof value?.toString === "function") {
        const normalized = value.toString();
        if (normalized && normalized !== "[object Object]") {
            return normalized;
        }
    }

    return "";
};

const hasBlockedUser = (userDoc, targetId) => {
    const targetIdString = toIdString(targetId);
    if (!targetIdString) return false;
    return (userDoc?.blockedUsers || []).some((entry) => toIdString(entry) === targetIdString);
};

const extractUserReactionEmoji = (reactions, currentUserKey) => {
    if (!currentUserKey || !Array.isArray(reactions)) return null;

    const entry = reactions.find(
        (reaction) => toIdString(reaction?.user || reaction) === currentUserKey
    );
    return entry?.emoji ? String(entry.emoji) : null;
};

const normalizeStory = (story, currentUserId, options = {}) => {
    const includeAudience = Boolean(options?.includeAudience);
    const storyObject = typeof story.toObject === "function" ? story.toObject() : story;
    const viewerSet = new Set(
        (storyObject.viewers || []).map((entry) => toIdString(entry?.user || entry))
    );
    const reactions = Array.isArray(storyObject.reactions) ? storyObject.reactions : [];
    const currentUserKey = currentUserId ? toIdString(currentUserId) : null;

    const normalized = {
        ...storyObject,
        hasViewed: currentUserKey ? viewerSet.has(currentUserKey) : false,
        myReaction: extractUserReactionEmoji(reactions, currentUserKey)
    };

    if (!includeAudience) {
        normalized.viewers = [];
        normalized.reactions = [];
    }

    return normalized;
};

class StoryService {
    async resolveAuthorAccess(authorId, currentUserId = null) {
        const author = await User.findById(authorId)
            .select("accountStatus isPrivate blockedUsers")
            .lean();

        if (!author || author.accountStatus !== "active") {
            throw createError("User not found", 404);
        }

        const authorIdString = toIdString(authorId);
        const viewerIdString = toIdString(currentUserId);
        const isOwner = Boolean(viewerIdString) && viewerIdString === authorIdString;

        if (isOwner) {
            return {
                isOwner: true,
                isPrivate: Boolean(author.isPrivate),
                isApprovedFollower: false,
                isBlockedContext: false
            };
        }

        if (!viewerIdString) {
            return {
                isOwner: false,
                isPrivate: Boolean(author.isPrivate),
                isApprovedFollower: false,
                isBlockedContext: false
            };
        }

        const viewer = await User.findById(currentUserId)
            .select("accountStatus blockedUsers")
            .lean();

        if (!viewer || viewer.accountStatus !== "active") {
            throw createError("User not found", 404);
        }

        const isBlockedContext = hasBlockedUser(author, currentUserId) || hasBlockedUser(viewer, authorId);
        if (isBlockedContext) {
            return {
                isOwner: false,
                isPrivate: Boolean(author.isPrivate),
                isApprovedFollower: false,
                isBlockedContext: true
            };
        }

        const relation = await Follow.checkRelationship(currentUserId, authorId);
        const isApprovedFollower = Boolean(relation?.isFollowing && relation?.isApproved);

        return {
            isOwner: false,
            isPrivate: Boolean(author.isPrivate),
            isApprovedFollower,
            isBlockedContext: false
        };
    }

    async createStory(userId, payload = {}) {
        const author = await User.findById(userId).select("name username accountStatus").lean();
        if (!author || author.accountStatus !== "active") {
            throw createError("Author not found or inactive", 404);
        }

        const caption = String(payload.caption || "").trim();
        const extractedByText = await resolveMentionUsersFromText([caption], {
            excludeUserIds: [userId]
        });

        const explicitMentionIds = Array.isArray(payload.mentions) ? payload.mentions : [];
        let explicitMentionUsers = [];
        if (explicitMentionIds.length > 0) {
            explicitMentionUsers = await User.find({
                _id: { $in: explicitMentionIds },
                accountStatus: "active",
                "preferences.privacy.allowTagging": { $ne: false }
            })
                .select("_id username name avatar")
                .lean();
        }

        const mentionMap = new Map();
        [...extractedByText, ...explicitMentionUsers].forEach((entry) => {
            if (!entry?._id) return;
            mentionMap.set(String(entry._id), entry);
        });
        const mentionUsers = Array.from(mentionMap.values());

        const extractedHashtags = Array.from(
            new Set(
                (caption.match(STORY_HASHTAG_REGEX) || []).map((value) =>
                    value.replace("#", "").toLowerCase()
                )
            )
        );
        const manualHashtags = Array.isArray(payload.hashtags)
            ? payload.hashtags.map((tag) => String(tag).replace(/^#/, "").toLowerCase())
            : [];

        const story = await Story.create({
            author: userId,
            caption,
            media: payload.media,
            visibility: payload.visibility || "public",
            mentions: mentionUsers.map((entry) => entry._id),
            hashtags: Array.from(new Set([...extractedHashtags, ...manualHashtags])),
            expiresAt: new Date(Date.now() + HOURS_24_IN_MS)
        });

        await story.populate("author", "username name avatar isVerified");
        await story.populate("mentions", "username name avatar");

        if (mentionUsers.length > 0) {
            const actorLabel = author.name || author.username || "Someone";
            await notifyMentionedUsers({
                actorId: userId,
                mentionUsers,
                title: "You were mentioned in a story",
                message: `${actorLabel} mentioned you in a story: "${getMentionSnippet(caption)}"`,
                type: "activity",
                category: "social",
                priority: "normal",
                entityType: "none",
                entityId: story._id,
                link: "/main/feed",
                metadata: {
                    source: "story.create",
                    storyId: story._id
                },
                dedupeKey: `mention:story:${String(story._id)}`
            });
        }

        return normalizeStory(story, userId, { includeAudience: true });
    }

    async getFeedStories(userId) {
        const followingIds = await Follow.find({
            follower: userId,
            status: "active",
            isApproved: true
        }).distinct("following");

        const authorIds = Array.from(new Set([...followingIds.map(String), String(userId)]));

        const stories = await Story.find({
            author: { $in: authorIds },
            status: "active",
            expiresAt: { $gt: new Date() }
        })
            .sort({ createdAt: -1 })
            .populate("author", "username name avatar isVerified")
            .lean();

        const groups = new Map();
        stories.forEach((story) => {
            const authorId = toIdString(story.author);
            if (!authorId) return;

            if (!groups.has(authorId)) {
                groups.set(authorId, {
                    author: story.author,
                    stories: [],
                    hasViewedAll: true,
                    unseenCount: 0,
                    lastStoryAt: story.createdAt
                });
            }

            const group = groups.get(authorId);
            const isOwnerStory = authorId === toIdString(userId);
            const normalizedStory = normalizeStory(story, userId, {
                includeAudience: isOwnerStory
            });
            const viewed = isOwnerStory ? true : Boolean(normalizedStory.hasViewed);
            normalizedStory.hasViewed = viewed;

            if (!viewed) {
                group.hasViewedAll = false;
                group.unseenCount += 1;
            }

            group.stories.push(normalizedStory);
        });

        const groupedStories = Array.from(groups.values())
            .map((group) => ({
                ...group,
                stories: group.stories.sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                )
            }))
            .sort((a, b) => new Date(b.lastStoryAt).getTime() - new Date(a.lastStoryAt).getTime());

        return { stories: groupedStories };
    }

    async getStoryById(storyId, currentUserId) {
        const story = await Story.findById(storyId)
            .populate("author", "username name avatar isVerified")
            .populate("mentions", "username name avatar");

        if (!story || story.status !== "active" || story.expiresAt <= new Date()) {
            throw createError("Story not found", 404);
        }

        const canView = await this.canUserViewStory(story, currentUserId);
        if (!canView) {
            throw createError("You do not have permission to view this story", 403);
        }

        const isOwner = toIdString(story.author) === toIdString(currentUserId);
        if (isOwner) {
            await story.populate("viewers.user", "username name avatar");
            await story.populate("reactions.user", "username name avatar");
        }

        return normalizeStory(story, currentUserId, { includeAudience: isOwner });
    }

    async markStoryViewed(storyId, userId) {
        const story = await this.getStoryById(storyId, userId);
        if (toIdString(story.author) === toIdString(userId)) {
            return story;
        }

        await Story.updateOne(
            {
                _id: storyId,
                "viewers.user": { $ne: userId }
            },
            {
                $push: {
                    viewers: {
                        user: userId,
                        viewedAt: new Date()
                    }
                },
                $inc: { viewsCount: 1 }
            }
        );

        return this.getStoryById(storyId, userId);
    }

    async reactToStory(storyId, userId, emoji) {
        const story = await Story.findById(storyId).select(
            "author visibility status expiresAt reactions"
        );
        if (!story || story.status !== "active" || story.expiresAt <= new Date()) {
            throw createError("Story not found", 404);
        }

        const canView = await this.canUserViewStory(story, userId);
        if (!canView) {
            throw createError("You do not have permission to view this story", 403);
        }

        const currentUserKey = toIdString(userId);
        const existingReaction = (story.reactions || []).find(
            (entry) => toIdString(entry?.user) === currentUserKey
        );
        const hasSameReaction = Boolean(existingReaction?.emoji) && existingReaction.emoji === emoji;

        await Story.updateOne(
            { _id: storyId },
            { $pull: { reactions: { user: userId } } }
        );

        if (!hasSameReaction) {
            await Story.updateOne(
                { _id: storyId },
                {
                    $push: {
                        reactions: {
                            user: userId,
                            emoji,
                            reactedAt: new Date()
                        }
                    }
                }
            );
        }

        return this.getStoryById(storyId, userId);
    }

    async getUserStories(userId, currentUserId) {
        const authorAccess = await this.resolveAuthorAccess(userId, currentUserId);
        if (authorAccess.isBlockedContext) {
            throw createError("You cannot view this profile", 403);
        }

        if (authorAccess.isPrivate && !authorAccess.isOwner && !authorAccess.isApprovedFollower) {
            throw createError("This profile is private", 403);
        }

        const stories = await Story.find({
            author: userId,
            status: "active",
            expiresAt: { $gt: new Date() }
        })
            .sort({ createdAt: 1 })
            .populate("author", "username name avatar isVerified")
            .populate("viewers.user", "username name avatar")
            .populate("reactions.user", "username name avatar")
            .lean();

        const isOwner = authorAccess.isOwner;
        const canViewFollowerStories = authorAccess.isApprovedFollower;

        const filtered = stories
            .filter((story) => {
                if (isOwner) return true;
                if (story.visibility === "public") {
                    return true;
                }
                return canViewFollowerStories;
            })
            .map((story) =>
                normalizeStory(story, currentUserId, { includeAudience: isOwner })
            );

        return { stories: filtered };
    }

    async deleteStory(storyId, userId) {
        const story = await Story.findById(storyId);
        if (!story || story.status !== "active") {
            throw createError("Story not found", 404);
        }
        if (String(story.author) !== String(userId)) {
            throw createError("You do not have permission to delete this story", 403);
        }

        story.status = "deleted";
        story.expiresAt = new Date();
        await story.save();

        return { success: true };
    }

    async canUserViewStory(story, userId) {
        const storyAuthorId = toIdString(story.author);
        if (!storyAuthorId) return false;

        const authorAccess = await this.resolveAuthorAccess(storyAuthorId, userId);
        if (authorAccess.isBlockedContext) return false;

        if (authorAccess.isPrivate && !authorAccess.isOwner && !authorAccess.isApprovedFollower) {
            return false;
        }

        if (authorAccess.isOwner) return true;
        if (story.visibility === "public") return true;

        return Boolean(userId) && Boolean(authorAccess.isApprovedFollower);
    }
}

module.exports = new StoryService();
