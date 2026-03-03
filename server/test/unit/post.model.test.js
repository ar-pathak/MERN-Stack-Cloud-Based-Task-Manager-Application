const mongoose = require("mongoose");
const Post = require("../../src/models/post");

const USER_ID = new mongoose.Types.ObjectId();

const createPostDoc = (overrides = {}) => new Post({
    author: USER_ID,
    content: "Hello #world @alice",
    ...overrides
});

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
