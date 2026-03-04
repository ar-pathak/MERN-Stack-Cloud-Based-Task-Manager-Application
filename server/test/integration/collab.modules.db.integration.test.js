const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

require("./helpers/loadEnv");

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-jwt-secret";
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "integration-refresh-secret";
process.env.RATE_LIMIT_STORE = "memory";
process.env.GLOBAL_RATE_LIMIT_MAX = process.env.GLOBAL_RATE_LIMIT_MAX || "1000";
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || "1000";

const connectDB = require("../../src/config/database");
const User = require("../../src/models/user");
const RefreshToken = require("../../src/models/RefreshToken");
const Workspace = require("../../src/models/workspace");
const WorkspaceMember = require("../../src/models/workspaceMember");
const WorkspaceInvite = require("../../src/models/workspaceInvite");
const Project = require("../../src/models/project");
const Team = require("../../src/models/team");
const Task = require("../../src/models/tasks");
const Subtask = require("../../src/models/subtasks");
const TaskAssigneeRequest = require("../../src/models/taskAssigneeRequest");
const Activity = require("../../src/models/activity");
const Chat = require("../../src/models/chat");
const Message = require("../../src/models/message");
const Follow = require("../../src/models/follow");
const Post = require("../../src/models/post");
const PostSave = require("../../src/models/postSave");
const Like = require("../../src/models/like");
const Comment = require("../../src/models/comment");
const Notification = require("../../src/models/notification");
const { httpServer, io } = require("../../src/app");

const hasMongoUrl = Boolean(String(process.env.MONGO_URL || "").trim());
const testWithDb = hasMongoUrl ? test : test.skip;

let baseUrl = "";

const createdEmails = new Set();
const createdUserIds = new Set();
const createdWorkspaceIds = new Set();
const createdProjectIds = new Set();
const createdTaskIds = new Set();
const createdPostIds = new Set();
const createdChatIds = new Set();

const context = {
    owner: null,
    member: null,
    outsider: null,
    workspaceId: null
};

const getSetCookieHeaders = (response) => {
    if (typeof response.headers.getSetCookie === "function") {
        return response.headers.getSetCookie();
    }

    const setCookieHeader = response.headers.get("set-cookie");
    return setCookieHeader ? [setCookieHeader] : [];
};

const parseCookieJar = (setCookieHeaders) => {
    const jar = {};

    for (const cookieLine of setCookieHeaders) {
        const firstSegment = String(cookieLine || "").split(";")[0].trim();
        if (!firstSegment) continue;

        const separatorIndex = firstSegment.indexOf("=");
        if (separatorIndex === -1) continue;

        const name = firstSegment.slice(0, separatorIndex).trim();
        const value = firstSegment.slice(separatorIndex + 1).trim();
        if (name) {
            jar[name] = value;
        }
    }

    return jar;
};

const toCookieHeader = (jar) => Object.entries(jar || {})
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

const requestJson = async (route, options = {}) => {
    const response = await fetch(`${baseUrl}${route}`, options);
    const body = await response.json();
    return { response, body };
};

const buildUserPayload = (prefix) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomInt(100000, 999999)}`;
    return {
        name: `${prefix} User`,
        email: `${String(prefix).toLowerCase()}.${uniqueSuffix}@example.com`,
        password: "Str0ng@Pass1"
    };
};

const signupUser = async (prefix) => {
    const payload = buildUserPayload(prefix);
    const signup = await requestJson("/api/auth/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    assert.equal(signup.response.status, 201);
    assert.equal(signup.body.success, true);

    const userId = signup.body.data?.user?.id;
    assert.ok(userId, "signup should return created user id");

    const cookieJar = parseCookieJar(getSetCookieHeaders(signup.response));
    assert.ok(cookieJar.accessToken, "signup should set access token cookie");

    createdEmails.add(payload.email.toLowerCase());
    createdUserIds.add(userId);

    return {
        userId,
        email: payload.email.toLowerCase(),
        cookieJar
    };
};

const getListItems = (payload) => {
    const data = payload?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.posts)) return data.posts;
    if (Array.isArray(data?.projects)) return data.projects;
    if (Array.isArray(data?.requests)) return data.requests;
    return [];
};

beforeAll(async () => {
    if (!hasMongoUrl) return;

    await connectDB();

    if (!httpServer.listening) {
        await new Promise((resolve) => {
            httpServer.listen(0, "127.0.0.1", resolve);
        });
    }

    const address = httpServer.address();
    const port = typeof address === "object" && address ? address.port : null;
    if (!port) {
        throw new Error("Failed to start HTTP server for collaboration integration tests");
    }

    baseUrl = `http://127.0.0.1:${port}`;

    context.owner = await signupUser("CollabOwner");
    context.member = await signupUser("CollabMember");
    context.outsider = await signupUser("CollabOutsider");

    const workspaceCreate = await requestJson("/api/workspace/createWorkspaces", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.owner.cookieJar)
        },
        body: JSON.stringify({
            name: `Collab Workspace ${Date.now()}`,
            description: "Workspace for collaboration module integration tests"
        })
    });

    assert.equal(workspaceCreate.response.status, 201);
    assert.equal(workspaceCreate.body.success, true);

    context.workspaceId = String(workspaceCreate.body.data?._id);
    assert.ok(context.workspaceId, "workspace create should return workspace id");
    createdWorkspaceIds.add(context.workspaceId);
    if (workspaceCreate.body.data?.chatId) {
        createdChatIds.add(String(workspaceCreate.body.data.chatId));
    }

    const addMember = await requestJson(`/api/workspace/${context.workspaceId}/members`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.owner.cookieJar)
        },
        body: JSON.stringify({
            userId: context.member.userId,
            role: "member"
        })
    });

    assert.equal(addMember.response.status, 201);
    assert.equal(addMember.body.success, true);
});

afterAll(async () => {
    if (!hasMongoUrl) return;

    const workspaceIds = [...createdWorkspaceIds];
    const userIds = [...createdUserIds];

    if (workspaceIds.length > 0) {
        const tasksInWorkspace = await Task.find({ workspace: { $in: workspaceIds } })
            .select("_id chatId")
            .lean();
        const projectsInWorkspace = await Project.find({ workspace: { $in: workspaceIds } })
            .select("_id chatId")
            .lean();
        const workspaces = await Workspace.find({ _id: { $in: workspaceIds } })
            .select("chatId")
            .lean();

        tasksInWorkspace.forEach((taskDoc) => {
            if (taskDoc?._id) createdTaskIds.add(String(taskDoc._id));
            if (taskDoc?.chatId) createdChatIds.add(String(taskDoc.chatId));
        });
        projectsInWorkspace.forEach((projectDoc) => {
            if (projectDoc?._id) createdProjectIds.add(String(projectDoc._id));
            if (projectDoc?.chatId) createdChatIds.add(String(projectDoc.chatId));
        });
        workspaces.forEach((workspaceDoc) => {
            if (workspaceDoc?.chatId) createdChatIds.add(String(workspaceDoc.chatId));
        });
    }

    if (createdTaskIds.size > 0) {
        const taskIds = [...createdTaskIds];
        await TaskAssigneeRequest.deleteMany({ task: { $in: taskIds } });
        await Subtask.deleteMany({ task: { $in: taskIds } });
    }

    if (workspaceIds.length > 0) {
        await Task.deleteMany({ workspace: { $in: workspaceIds } });
        await Team.deleteMany({ workspace: { $in: workspaceIds } });
        await Project.deleteMany({ workspace: { $in: workspaceIds } });
        await WorkspaceInvite.deleteMany({ workspace: { $in: workspaceIds } });
        await WorkspaceMember.deleteMany({ workspace: { $in: workspaceIds } });
        await Activity.deleteMany({ workspace: { $in: workspaceIds } });
        await Workspace.deleteMany({ _id: { $in: workspaceIds } });
    }

    if (userIds.length > 0) {
        await Follow.deleteMany({
            $or: [
                { follower: { $in: userIds } },
                { following: { $in: userIds } }
            ]
        });
        await Notification.deleteMany({
            $or: [
                { user: { $in: userIds } },
                { actor: { $in: userIds } }
            ]
        });
    }

    if (createdPostIds.size > 0 || userIds.length > 0) {
        const postIds = [...createdPostIds];
        await Comment.deleteMany({
            $or: [
                ...(postIds.length ? [{ post: { $in: postIds } }] : []),
                ...(userIds.length ? [{ author: { $in: userIds } }] : [])
            ]
        });
        await Like.deleteMany({
            $or: [
                ...(postIds.length ? [{ post: { $in: postIds } }] : []),
                ...(userIds.length ? [{ user: { $in: userIds } }] : [])
            ]
        });
        await PostSave.deleteMany({
            $or: [
                ...(postIds.length ? [{ post: { $in: postIds } }] : []),
                ...(userIds.length ? [{ user: { $in: userIds } }] : [])
            ]
        });
        await Post.deleteMany({
            $or: [
                ...(postIds.length ? [{ _id: { $in: postIds } }, { originalPost: { $in: postIds } }] : []),
                ...(userIds.length ? [{ author: { $in: userIds } }] : [])
            ]
        });
    }

    if (createdChatIds.size > 0) {
        const chatIds = [...createdChatIds];
        await Message.deleteMany({ chatId: { $in: chatIds } });
        await Chat.deleteMany({ _id: { $in: chatIds } });
    }

    if (userIds.length > 0) {
        await RefreshToken.deleteMany({ user: { $in: userIds } });
    }

    if (createdEmails.size > 0) {
        await User.deleteMany({ email: { $in: [...createdEmails] } });
    }

    await new Promise((resolve) => io.close(resolve));
    if (httpServer.listening) {
        await new Promise((resolve) => httpServer.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});

testWithDb("project + task owner flows create and list records", async () => {
    const createProject = await requestJson(`/api/projects/workspaces/${context.workspaceId}/projects`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.owner.cookieJar)
        },
        body: JSON.stringify({
            name: `Collab Project ${Date.now()}`,
            description: "Project created from integration suite"
        })
    });

    assert.equal(createProject.response.status, 201);
    assert.equal(createProject.body.success, true);

    const projectId = String(createProject.body.data?._id);
    assert.ok(projectId, "project create should return project id");
    createdProjectIds.add(projectId);
    if (createProject.body.data?.chatId) {
        createdChatIds.add(String(createProject.body.data.chatId));
    }

    const createTask = await requestJson(
        `/api/tasks/workspace/${context.workspaceId}/project/${projectId}/createTasksAtProjectLevel`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: toCookieHeader(context.owner.cookieJar)
            },
            body: JSON.stringify({
                title: `Collab Task ${Date.now()}`
            })
        }
    );

    assert.equal(createTask.response.status, 201);
    assert.equal(createTask.body.success, true);

    const taskId = String(createTask.body.data?._id);
    assert.ok(taskId, "task create should return task id");
    createdTaskIds.add(taskId);
    if (createTask.body.data?.chatId) {
        createdChatIds.add(String(createTask.body.data.chatId));
    }

    const listProjects = await requestJson(`/api/projects/workspaces/${context.workspaceId}/projects`, {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(context.owner.cookieJar)
        }
    });

    assert.equal(listProjects.response.status, 200);
    const projectItems = getListItems(listProjects.body);
    assert.ok(projectItems.some((entry) => String(entry?._id) === projectId));

    const listTasks = await requestJson(
        `/api/tasks/workspaces/${context.workspaceId}/projects/${projectId}/tasks?page=1&limit=20`,
        {
            method: "GET",
            headers: {
                Cookie: toCookieHeader(context.owner.cookieJar)
            }
        }
    );

    assert.equal(listTasks.response.status, 200);
    const taskItems = getListItems(listTasks.body);
    assert.ok(taskItems.some((entry) => String(entry?._id) === taskId));
}, 120000);

testWithDb("project/task endpoints enforce validation and role access", async () => {
    const memberProjectCreate = await requestJson(`/api/projects/workspaces/${context.workspaceId}/projects`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.member.cookieJar)
        },
        body: JSON.stringify({
            name: `Forbidden Project ${Date.now()}`
        })
    });

    assert.equal(memberProjectCreate.response.status, 403);
    assert.equal(memberProjectCreate.body.message, "Access denied");

    const invalidTaskPayload = await requestJson(
        `/api/tasks/workspace/${context.workspaceId}/createTasksAtWorkspaceLevel`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: toCookieHeader(context.owner.cookieJar)
            },
            body: JSON.stringify({})
        }
    );

    assert.equal(invalidTaskPayload.response.status, 400);
    assert.equal(invalidTaskPayload.body.success, false);
    assert.equal(invalidTaskPayload.body.message, "Validation error");

    const memberTaskCreate = await requestJson(
        `/api/tasks/workspace/${context.workspaceId}/createTasksAtWorkspaceLevel`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: toCookieHeader(context.member.cookieJar)
            },
            body: JSON.stringify({
                title: `Forbidden Task ${Date.now()}`
            })
        }
    );

    assert.equal(memberTaskCreate.response.status, 403);
    assert.match(
        String(memberTaskCreate.body.message || ""),
        /only workspace owners and admins can create tasks|access denied/i
    );
});

testWithDb("follow + posts workflow supports follow, feed visibility, and unfollow", async () => {
    const followOwner = await requestJson(`/api/follow/${context.owner.userId}/follow`, {
        method: "POST",
        headers: {
            Cookie: toCookieHeader(context.member.cookieJar)
        }
    });

    assert.equal(followOwner.response.status, 200);
    assert.equal(followOwner.body.success, true);
    assert.equal(followOwner.body.data?.isPending, false);

    const createPost = await requestJson("/api/posts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.owner.cookieJar)
        },
        body: JSON.stringify({
            content: `Integration post ${Date.now()}`
        })
    });

    assert.equal(createPost.response.status, 201);
    assert.equal(createPost.body.success, true);

    const postId = String(createPost.body.data?.post?._id);
    assert.ok(postId, "create post should return post id");
    createdPostIds.add(postId);

    const memberFeed = await requestJson("/api/posts/feed?page=1&limit=20", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(context.member.cookieJar)
        }
    });

    assert.equal(memberFeed.response.status, 200);
    assert.equal(memberFeed.body.success, true);
    const feedPosts = getListItems(memberFeed.body);
    assert.ok(feedPosts.some((entry) => String(entry?._id) === postId));

    const unfollowOwner = await requestJson(`/api/follow/${context.owner.userId}/follow`, {
        method: "DELETE",
        headers: {
            Cookie: toCookieHeader(context.member.cookieJar)
        }
    });

    assert.equal(unfollowOwner.response.status, 200);
    assert.equal(unfollowOwner.body.success, true);

    const followStatus = await requestJson(`/api/follow/${context.owner.userId}/following/status`, {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(context.member.cookieJar)
        }
    });

    assert.equal(followStatus.response.status, 200);
    assert.equal(followStatus.body.success, true);
    assert.equal(followStatus.body.data?.isFollowing, false);
});

testWithDb("private account flow returns pending follow request and allows approval", async () => {
    const makePrivate = await requestJson("/api/user/me", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.owner.cookieJar)
        },
        body: JSON.stringify({
            isPrivate: true
        })
    });

    assert.equal(makePrivate.response.status, 200);
    assert.equal(makePrivate.body.success, true);

    const requestFollow = await requestJson(`/api/follow/${context.owner.userId}/follow`, {
        method: "POST",
        headers: {
            Cookie: toCookieHeader(context.outsider.cookieJar)
        }
    });

    assert.equal(requestFollow.response.status, 200);
    assert.equal(requestFollow.body.success, true);
    assert.equal(requestFollow.body.data?.isPending, true);

    const pendingRequests = await requestJson("/api/follow/requests/pending?page=1&limit=20", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(context.owner.cookieJar)
        }
    });

    assert.equal(pendingRequests.response.status, 200);
    assert.equal(pendingRequests.body.success, true);
    const requestItems = getListItems(pendingRequests.body);
    const outsiderRequest = requestItems.find((entry) => String(entry?._id) === context.outsider.userId);
    assert.ok(outsiderRequest?.requestId, "pending requests should include outsider request");

    const approve = await requestJson(`/api/follow/requests/${outsiderRequest.requestId}/approve`, {
        method: "POST",
        headers: {
            Cookie: toCookieHeader(context.owner.cookieJar)
        }
    });

    assert.equal(approve.response.status, 200);
    assert.equal(approve.body.success, true);

    const followStatus = await requestJson(`/api/follow/${context.owner.userId}/following/status`, {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(context.outsider.cookieJar)
        }
    });

    assert.equal(followStatus.response.status, 200);
    assert.equal(followStatus.body.success, true);
    assert.equal(followStatus.body.data?.isFollowing, true);
    assert.equal(followStatus.body.data?.isApproved, true);

    const makePublic = await requestJson("/api/user/me", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.owner.cookieJar)
        },
        body: JSON.stringify({
            isPrivate: false
        })
    });

    assert.equal(makePublic.response.status, 200);
    assert.equal(makePublic.body.success, true);
});

testWithDb("user/profile and module validation errors return expected 4xx responses", async () => {
    const myProfile = await requestJson("/api/user/me", {
        method: "GET",
        headers: {
            Cookie: toCookieHeader(context.owner.cookieJar)
        }
    });

    assert.equal(myProfile.response.status, 200);
    assert.equal(myProfile.body.success, true);
    assert.equal(String(myProfile.body.data?.user?._id || myProfile.body.data?.user?.id), context.owner.userId);

    const updatePreferences = await requestJson("/api/user/me/preferences", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.owner.cookieJar)
        },
        body: JSON.stringify({
            preferences: {
                privacy: {
                    showEmail: false
                }
            }
        })
    });

    assert.equal(updatePreferences.response.status, 200);
    assert.equal(updatePreferences.body.success, true);

    const invalidUsernameCheck = await requestJson("/api/user/check-username/ab", {
        method: "GET"
    });

    assert.equal(invalidUsernameCheck.response.status, 400);
    assert.equal(invalidUsernameCheck.body.success, false);
    assert.match(String(invalidUsernameCheck.body.message || ""), /validation error/i);

    const invalidPostPayload = await requestJson("/api/posts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.owner.cookieJar)
        },
        body: JSON.stringify({})
    });

    assert.equal(invalidPostPayload.response.status, 400);
    assert.equal(invalidPostPayload.body.success, false);
    assert.match(String(invalidPostPayload.body.message || ""), /validation error/i);

    const invalidFollowId = await requestJson("/api/follow/not-an-object-id/follow", {
        method: "POST",
        headers: {
            Cookie: toCookieHeader(context.owner.cookieJar)
        }
    });

    assert.equal(invalidFollowId.response.status, 400);
    assert.equal(invalidFollowId.body.success, false);
    assert.match(String(invalidFollowId.body.message || ""), /validation error/i);
});
