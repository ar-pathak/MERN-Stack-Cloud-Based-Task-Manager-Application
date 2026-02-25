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
const Message = require("../../src/models/message");
const Activity = require("../../src/models/activity");
const Chat = require("../../src/models/chat");
const { httpServer, io } = require("../../src/app");

const hasMongoUrl = Boolean(String(process.env.MONGO_URL || "").trim());
const testWithDb = hasMongoUrl ? test : test.skip;

let baseUrl = "";
const createdEmails = new Set();
const createdUserIds = new Set();
const createdWorkspaceIds = new Set();
const createdChatIds = new Set();

const context = {
    owner: null,
    member: null,
    viewer: null,
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
    assert.ok(cookieJar.accessToken, "signup should return access token cookie");

    createdEmails.add(payload.email.toLowerCase());
    createdUserIds.add(userId);

    return {
        userId,
        email: payload.email.toLowerCase(),
        cookieJar
    };
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
        throw new Error("Failed to start HTTP server for RBAC integration tests");
    }

    baseUrl = `http://127.0.0.1:${port}`;

    context.owner = await signupUser("Owner");
    context.member = await signupUser("Member");
    context.viewer = await signupUser("Viewer");
    context.outsider = await signupUser("Outsider");

    const workspaceName = `RBAC Workspace ${Date.now()}`;
    const workspaceCreate = await requestJson("/api/workspace/createWorkspaces", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.owner.cookieJar)
        },
        body: JSON.stringify({
            name: workspaceName,
            description: "Workspace for RBAC protected-route tests"
        })
    });

    assert.equal(workspaceCreate.response.status, 201);
    assert.equal(workspaceCreate.body.success, true);

    const workspace = workspaceCreate.body.data;
    assert.ok(workspace?._id, "workspace create should return workspace id");

    context.workspaceId = String(workspace._id);
    createdWorkspaceIds.add(context.workspaceId);
    if (workspace?.chatId) {
        createdChatIds.add(String(workspace.chatId));
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

    const addViewer = await requestJson(`/api/workspace/${context.workspaceId}/members`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.owner.cookieJar)
        },
        body: JSON.stringify({
            userId: context.viewer.userId,
            role: "viewer"
        })
    });

    assert.equal(addViewer.response.status, 201);
    assert.equal(addViewer.body.success, true);
});

afterAll(async () => {
    if (!hasMongoUrl) return;

    if (createdWorkspaceIds.size > 0) {
        const workspaceIds = [...createdWorkspaceIds];
        const tasksInWorkspace = await Task.find({ workspace: { $in: workspaceIds } })
            .select("_id")
            .lean();
        const taskIds = tasksInWorkspace.map((task) => task._id);
        if (taskIds.length > 0) {
            await Subtask.deleteMany({ task: { $in: taskIds } });
        }
        await Task.deleteMany({ workspace: { $in: workspaceIds } });
        await Team.deleteMany({ workspace: { $in: workspaceIds } });
        await Project.deleteMany({ workspace: { $in: workspaceIds } });
        await WorkspaceInvite.deleteMany({ workspace: { $in: workspaceIds } });
        await WorkspaceMember.deleteMany({ workspace: { $in: workspaceIds } });
        await Activity.deleteMany({ workspace: { $in: workspaceIds } });
        await Workspace.deleteMany({ _id: { $in: workspaceIds } });
    }

    if (createdChatIds.size > 0) {
        const chatIds = [...createdChatIds];
        await Message.deleteMany({ chatId: { $in: chatIds } });
        await Chat.deleteMany({ _id: { $in: chatIds } });
    }

    if (createdUserIds.size > 0) {
        await RefreshToken.deleteMany({ user: { $in: [...createdUserIds] } });
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

testWithDb("protected routes reject unauthenticated requests across workspace/project/task/team modules", async () => {
    const protectedRequests = [
        {
            route: "/api/workspace/createWorkspaces",
            method: "POST",
            body: { name: "Unauth Workspace" }
        },
        {
            route: `/api/projects/workspaces/${context.workspaceId}/projects`,
            method: "POST",
            body: { name: "Unauth Project" }
        },
        {
            route: `/api/tasks/workspace/${context.workspaceId}/createTasksAtWorkspaceLevel`,
            method: "POST",
            body: { title: "Unauth Task" }
        },
        {
            route: `/api/teams/workspaces/${context.workspaceId}/teams`,
            method: "POST",
            body: { name: "Unauth Team" }
        }
    ];

    for (const requestConfig of protectedRequests) {
        const result = await requestJson(requestConfig.route, {
            method: requestConfig.method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestConfig.body)
        });

        assert.equal(result.response.status, 401);
        assert.equal(result.body.success, false);
        assert.equal(result.body.message, "Authentication required. No token provided.");
    }
});

testWithDb("workspace member-management route denies non-admin member", async () => {
    const addMemberAttempt = await requestJson(`/api/workspace/${context.workspaceId}/members`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.member.cookieJar)
        },
        body: JSON.stringify({
            userId: context.outsider.userId,
            role: "member"
        })
    });

    assert.equal(addMemberAttempt.response.status, 403);
    assert.equal(addMemberAttempt.body.message, "Access denied");

    const outsiderMembership = await WorkspaceMember.findOne({
        workspace: context.workspaceId,
        user: context.outsider.userId
    }).lean();
    assert.equal(outsiderMembership, null);
});

testWithDb("project create route denies workspace member without owner/admin role", async () => {
    const createProject = await requestJson(`/api/projects/workspaces/${context.workspaceId}/projects`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.member.cookieJar)
        },
        body: JSON.stringify({
            name: `Denied Project ${Date.now()}`
        })
    });

    assert.equal(createProject.response.status, 403);
    assert.equal(createProject.body.message, "Access denied");
});

testWithDb("team create route denies workspace viewer", async () => {
    const createTeam = await requestJson(`/api/teams/workspaces/${context.workspaceId}/teams`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: toCookieHeader(context.viewer.cookieJar)
        },
        body: JSON.stringify({
            name: `Denied Team ${Date.now()}`
        })
    });

    assert.equal(createTeam.response.status, 403);
    assert.equal(createTeam.body.message, "Access denied");
});

testWithDb("workspace-level task create enforces admin-only permission", async () => {
    const taskTitle = `Denied Task ${Date.now()}`;
    const createTask = await requestJson(
        `/api/tasks/workspace/${context.workspaceId}/createTasksAtWorkspaceLevel`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: toCookieHeader(context.member.cookieJar)
            },
            body: JSON.stringify({
                title: taskTitle
            })
        }
    );

    assert.equal(createTask.response.status, 403);
    assert.equal(createTask.body.message, "Only workspace owners and admins can create tasks");

    const storedTask = await Task.findOne({ workspace: context.workspaceId, title: taskTitle }).lean();
    assert.equal(storedTask, null);
});

testWithDb("non-member user is blocked from workspace-scoped list routes", async () => {
    const outsiderCookie = toCookieHeader(context.outsider.cookieJar);
    const listRoutes = [
        `/api/workspace/${context.workspaceId}/members`,
        `/api/projects/workspaces/${context.workspaceId}/projects`,
        `/api/teams/workspaces/${context.workspaceId}/teams`,
        `/api/tasks/workspaces/${context.workspaceId}/tasks`
    ];

    for (const route of listRoutes) {
        const result = await requestJson(route, {
            method: "GET",
            headers: {
                Cookie: outsiderCookie
            }
        });

        assert.equal(result.response.status, 403);
        assert.equal(result.body.message, "Access denied");
    }
});
