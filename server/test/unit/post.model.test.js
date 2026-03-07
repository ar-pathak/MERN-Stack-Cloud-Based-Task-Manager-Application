const mongoose = require("mongoose");
const Post = require("../../src/models/post");
const User = require("../../src/models/user");

const USER_ID = new mongoose.Types.ObjectId();

const createPostDoc = (overrides = {}) => new Post({
    author: USER_ID,
    content: "Hello #world @alice",
    ...overrides
});

const getPostHook = (type, hookName, marker) => Post.schema.s.hooks[type].get(hookName)
    .find((entry) => String(entry.fn).includes(marker))
    .fn;

afterEach(() => {
    jest.restoreAllMocks();
});

test("virtuals expose engagement and post type helpers", () => {
    const pollEndsAt = new Date(Date.now() + 60_000);
    const post = createPostDoc({
        viewsCount: 100,
        likesCount: 20,
        commentsCount: 10,
        repostsCount: 5,
        sharesCount: 5,
        postType: "poll",
        poll: { endsAt: pollEndsAt },
        media: [{ type: "image", url: "https://example.com/a.png" }],
        originalPost: new mongoose.Types.ObjectId()
    });

    post.postType = "repost";
    expect(post.engagementRate).toBe("40.00");
    expect(post.isRepost).toBe(true);
    expect(post.isQuote).toBe(false);
    expect(post.hasMedia).toBe(true);

    post.postType = "poll";
    expect(post.isPollActive).toBe(true);
});

test("virtuals return falsey helpers for empty engagement, quote, and inactive polls", () => {
    const post = createPostDoc({
        viewsCount: 0,
        postType: "quote",
        originalPost: new mongoose.Types.ObjectId(),
        media: [],
        poll: { endsAt: new Date(Date.now() - 60_000) }
    });

    expect(post.engagementRate).toBe(0);
    expect(post.isQuote).toBe(true);
    expect(post.hasMedia).toBe(false);
    expect(post.isPollActive).toBe(false);

    post.postType = "text";
    expect(post.isQuote).toBe(false);
    expect(post.isPollActive).toBe(false);
});

test("toPublicJSON removes sensitive metadata and optionally hides likes count", () => {
    const post = createPostDoc({
        metadata: { ipAddress: "127.0.0.1" },
        flags: { count: 1 },
        likesCount: 15,
        settings: { hideLikesCount: true }
    });
    post.__v = 3;

    const payload = post.toPublicJSON();

    expect(payload.metadata).toBeUndefined();
    expect(payload.flags).toBeUndefined();
    expect(payload.__v).toBeUndefined();
    expect(payload.likesCount).toBeUndefined();
});

test("toPublicJSON keeps likes count when likes are visible", () => {
    const post = createPostDoc({
        likesCount: 9,
        settings: { hideLikesCount: false }
    });

    const payload = post.toPublicJSON();

    expect(payload.likesCount).toBe(9);
});

test("canBeViewedBy enforces visibility and status combinations", () => {
    const authorId = new mongoose.Types.ObjectId();
    const post = createPostDoc({
        author: authorId,
        status: "active",
        visibility: "public"
    });

    expect(post.canBeViewedBy(null)).toBe(true);

    post.visibility = "followers";
    expect(post.canBeViewedBy(new mongoose.Types.ObjectId())).toBe("CHECK_FOLLOW");

    post.visibility = "private";
    expect(post.canBeViewedBy(new mongoose.Types.ObjectId())).toBe(false);
    expect(post.canBeViewedBy(authorId)).toBe(true);

    post.status = "scheduled";
    expect(post.canBeViewedBy(null)).toBe(false);
    expect(post.canBeViewedBy(authorId)).toBe(true);

    post.status = "deleted";
    expect(post.canBeViewedBy(authorId)).toBe(false);
});

test("canBeViewedBy supports unlisted posts and falls back to false for unknown visibility", () => {
    const authorId = new mongoose.Types.ObjectId();
    const viewerId = new mongoose.Types.ObjectId();
    const post = createPostDoc({
        author: authorId,
        status: "active",
        visibility: "unlisted"
    });

    expect(post.canBeViewedBy(viewerId)).toBe(true);

    post.visibility = "custom";
    expect(post.canBeViewedBy(viewerId)).toBe(false);
});

test("incrementView increments views and delegates save", async () => {
    const post = createPostDoc({ viewsCount: 7 });
    post.save = jest.fn().mockResolvedValue(post);

    await post.incrementView();

    expect(post.viewsCount).toBe(8);
    expect(post.save).toHaveBeenCalledTimes(1);
});

test("extractHashtags and extractMentions normalize tokens", () => {
    const post = createPostDoc({
        content: "Hello #World #MERN and @Alice with @Bob_1"
    });

    expect(post.extractHashtags()).toEqual(["world", "mern"]);
    expect(post.extractMentions()).toEqual(["alice", "bob_1"]);
});

test("extractHashtags and extractMentions return empty arrays when no tokens exist", () => {
    const post = createPostDoc({
        content: "No hashtags or mentions here"
    });

    expect(post.extractHashtags()).toEqual([]);
    expect(post.extractMentions()).toEqual([]);
});

test("getFeedQuery returns scoped query by feed type", () => {
    expect(Post.getFeedQuery(USER_ID, "public")).toEqual({
        status: "active",
        visibility: "public"
    });

    expect(Post.getFeedQuery(USER_ID, "following")).toEqual({
        status: "active",
        visibility: { $in: ["public", "followers"] }
    });

    expect(Post.getFeedQuery(USER_ID, "user")).toEqual({
        status: "active"
    });

    expect(Post.getFeedQuery(USER_ID, "unknown")).toEqual({
        status: "active",
        visibility: "public"
    });
});

test("getTrendingPosts builds query chain with timeframe window", async () => {
    const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: "p1" }])
    };
    const findSpy = jest.spyOn(Post, "find").mockReturnValue(chain);

    const rows = await Post.getTrendingPosts(5, 12);

    expect(findSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: "active",
        visibility: "public",
        createdAt: expect.objectContaining({ $gte: expect.any(Date) })
    }));
    expect(chain.sort).toHaveBeenCalledWith({ likesCount: -1, viewsCount: -1 });
    expect(chain.limit).toHaveBeenCalledWith(5);
    expect(rows).toEqual([{ _id: "p1" }]);
});

test("pre-validate normalizes invalid location payload", async () => {
    const withName = createPostDoc({
        location: {
            name: "Office",
            coordinates: { type: "Point", coordinates: [200] }
        }
    });
    await withName.validate();
    expect(withName.location).toEqual(expect.objectContaining({ name: "Office" }));
    expect(withName.location.coordinates?.coordinates).toBeUndefined();

    const noName = createPostDoc({
        location: {
            coordinates: { type: "Point", coordinates: [200] }
        }
    });
    await noName.validate();
    expect(noName.location?.name).toBeUndefined();
    expect(noName.location?.coordinates?.coordinates).toBeUndefined();
});

test("location coordinate validator accepts null and valid pairs, and rejects malformed values", () => {
    const validator = Post.schema.path("location.coordinates.coordinates").validators[0].validator;

    expect(validator(null)).toBe(true);
    expect(validator([77.2, 28.6])).toBe(true);
    expect(validator([77.2])).toBe(false);
    expect(validator([181, 28.6])).toBe(false);
});

test("pre hooks normalize content, edit, and publish metadata branches", async () => {
    const trackNewHook = getPostHook("_pres", "save", "this.wasNew = this.isNew");
    const validateLocationHook = getPostHook("_pres", "validate", "geo.type = 'Point'");
    const hashtagHook = getPostHook("_pres", "save", "this.extractHashtags()");
    const editHook = getPostHook("_pres", "save", "this.isEdited = true");
    const publishHook = getPostHook("_pres", "save", "Scheduled posts require a valid schedule time");

    const fresh = createPostDoc();
    fresh.isNew = true;
    trackNewHook.call(fresh);
    expect(fresh.wasNew).toBe(true);

    const withValidLocation = createPostDoc({
        location: {
            name: "Office",
            coordinates: { coordinates: [77.2, 28.6] }
        }
    });
    validateLocationHook.call(withValidLocation);
    expect(withValidLocation.location.coordinates.type).toBe("Point");

    const withTags = createPostDoc({
        hashtags: ["world"],
        content: "Hello #World #MERN"
    });
    withTags.isModified = jest.fn().mockImplementation((field) => field === "content");
    hashtagHook.call(withTags);
    expect(withTags.hashtags).toEqual(["world", "mern"]);

    const withoutTags = createPostDoc({
        hashtags: ["existing"],
        content: "Plain text only"
    });
    withoutTags.isModified = jest.fn().mockImplementation((field) => field === "content");
    hashtagHook.call(withoutTags);
    expect(withoutTags.hashtags).toEqual(["existing"]);

    const edited = createPostDoc();
    edited.isNew = false;
    edited.isModified = jest.fn().mockImplementation((field) => field === "content");
    editHook.call(edited);
    expect(edited.isEdited).toBe(true);
    expect(edited.editedAt).toBeInstanceOf(Date);

    const scheduled = createPostDoc({
        status: "scheduled",
        scheduledFor: new Date("2026-03-10T00:00:00.000Z"),
        publishedAt: new Date("2026-03-01T00:00:00.000Z")
    });
    scheduled.invalidate = jest.fn();
    publishHook.call(scheduled);
    expect(scheduled.publishedAt).toBeUndefined();
    expect(scheduled.invalidate).not.toHaveBeenCalled();

    const invalidScheduled = createPostDoc({
        status: "scheduled",
        scheduledFor: "invalid-date"
    });
    invalidScheduled.invalidate = jest.fn();
    publishHook.call(invalidScheduled);
    expect(invalidScheduled.invalidate).toHaveBeenCalledWith(
        "scheduledFor",
        "Scheduled posts require a valid schedule time"
    );

    const active = createPostDoc({
        status: "active",
        scheduledFor: new Date("2026-03-12T00:00:00.000Z"),
        publishedAt: null
    });
    active.invalidate = jest.fn();
    publishHook.call(active);
    expect(active.scheduledFor).toBeUndefined();
    expect(active.publishedAt).toBeInstanceOf(Date);
});

test("post-save and delete hooks update author post counters with optional sessions", async () => {
    const postSaveHook = getPostHook("_posts", "save", "doc.wasNew");
    const deleteHook = Post.schema.s.hooks._posts.get("findOneAndDelete")
        .find((entry) => String(entry.fn).includes("postsCount: -1"))
        .fn;
    const updateSpy = jest.spyOn(User, "findByIdAndUpdate").mockResolvedValue(null);
    const session = { id: "session-1" };

    const newDoc = createPostDoc();
    newDoc.wasNew = true;
    newDoc.$session = jest.fn().mockReturnValue(session);
    await postSaveHook.call(newDoc, newDoc);
    expect(updateSpy).toHaveBeenCalledWith(
        newDoc.author,
        { $inc: { postsCount: 1 } },
        { session }
    );

    updateSpy.mockClear();
    const existingDoc = createPostDoc();
    existingDoc.wasNew = false;
    await postSaveHook.call(existingDoc, existingDoc);
    expect(updateSpy).not.toHaveBeenCalled();

    const deletedDoc = { author: USER_ID };
    await deleteHook.call({ getOptions: () => ({ session }) }, deletedDoc);
    expect(updateSpy).toHaveBeenCalledWith(
        USER_ID,
        { $inc: { postsCount: -1 } },
        { session }
    );

    updateSpy.mockClear();
    await deleteHook.call({}, null);
    expect(updateSpy).not.toHaveBeenCalled();
});
