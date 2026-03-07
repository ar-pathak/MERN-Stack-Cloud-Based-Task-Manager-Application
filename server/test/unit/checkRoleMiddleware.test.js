jest.mock("../../src/models/workspaceMember", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/middleware/resolveTaskCreatePermission", () => ({
    canCreateTask: jest.fn()
}));

const WorkspaceMember = require("../../src/models/workspaceMember");
const { canCreateTask } = require("../../src/middleware/resolveTaskCreatePermission");
const {
    checkWorkspaceMemberRole,
    checkCanCreateTask
} = require("../../src/middleware/checkRoleMiddleware");

const createResponse = () => {
    const res = {
        statusCode: 200,
        body: null
    };
    res.status = jest.fn((statusCode) => {
        res.statusCode = statusCode;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    return res;
};

beforeEach(() => {
    jest.resetAllMocks();
});

test("checkWorkspaceMemberRole rejects non-members and unauthorized roles", async () => {
    WorkspaceMember.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ role: "viewer" });

    const middleware = checkWorkspaceMemberRole("owner", "admin");

    const firstRes = createResponse();
    await middleware(
        { params: { workspaceId: "workspace-1" }, user: { _id: "user-1" } },
        firstRes,
        jest.fn()
    );

    expect(firstRes.statusCode).toBe(403);
    expect(firstRes.body).toEqual({ message: "Access denied" });

    const secondRes = createResponse();
    const next = jest.fn();
    await middleware(
        { params: { workspaceId: "workspace-1" }, user: { _id: "user-1" } },
        secondRes,
        next
    );

    expect(secondRes.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
});

test("checkWorkspaceMemberRole allows matching roles", async () => {
    WorkspaceMember.findOne.mockResolvedValue({ role: "admin" });

    const middleware = checkWorkspaceMemberRole("owner", "admin");
    const next = jest.fn();

    await middleware(
        { params: { workspaceId: "workspace-1" }, user: { _id: "user-1" } },
        createResponse(),
        next
    );

    expect(WorkspaceMember.findOne).toHaveBeenCalledWith({
        workspace: "workspace-1",
        user: "user-1"
    });
    expect(next).toHaveBeenCalledTimes(1);
});

test("checkCanCreateTask validates workspace, project, and team ids", async () => {
    const middleware = checkCanCreateTask();

    const invalidWorkspaceRes = createResponse();
    await middleware(
        { params: { workspaceId: "bad-id" }, user: { _id: "user-1" }, body: {} },
        invalidWorkspaceRes,
        jest.fn()
    );
    expect(invalidWorkspaceRes.statusCode).toBe(400);
    expect(invalidWorkspaceRes.body).toEqual({ message: "Invalid workspaceId" });

    const invalidProjectRes = createResponse();
    await middleware(
        {
            params: {
                workspaceId: "507f1f77bcf86cd799439011",
                projectId: "bad-project"
            },
            user: { _id: "user-1" },
            body: {}
        },
        invalidProjectRes,
        jest.fn()
    );
    expect(invalidProjectRes.statusCode).toBe(400);
    expect(invalidProjectRes.body).toEqual({ message: "Invalid projectId" });

    const invalidTeamRes = createResponse();
    await middleware(
        {
            params: {
                workspaceId: "507f1f77bcf86cd799439011",
                teamId: "bad-team"
            },
            user: { _id: "user-1" },
            body: {}
        },
        invalidTeamRes,
        jest.fn()
    );
    expect(invalidTeamRes.statusCode).toBe(400);
    expect(invalidTeamRes.body).toEqual({ message: "Invalid teamId" });
});

test("checkCanCreateTask filters payload team ids and allows authorized requests", async () => {
    canCreateTask.mockResolvedValue(true);

    const middleware = checkCanCreateTask();
    const req = {
        params: {
            workspaceId: "507f1f77bcf86cd799439011",
            projectId: "507f1f77bcf86cd799439012",
            teamId: "507f1f77bcf86cd799439013"
        },
        user: { _id: "user-1" },
        body: {
            assigneesTeams: [
                "507f1f77bcf86cd799439014",
                "invalid-team",
                "507f1f77bcf86cd799439015"
            ]
        }
    };
    const next = jest.fn();

    await middleware(req, createResponse(), next);

    expect(canCreateTask).toHaveBeenCalledWith({
        userId: "user-1",
        workspaceId: "507f1f77bcf86cd799439011",
        projectId: "507f1f77bcf86cd799439012",
        teamId: "507f1f77bcf86cd799439013",
        teamIds: [
            "507f1f77bcf86cd799439014",
            "507f1f77bcf86cd799439015"
        ],
        enforceWorkspaceAdminOnly: false,
        requireProjectAdminOrWorkspaceOwner: true
    });
    expect(next).toHaveBeenCalledTimes(1);
});

test("checkCanCreateTask returns scoped denial messages", async () => {
    canCreateTask.mockResolvedValue(false);
    const middleware = checkCanCreateTask();

    const workspaceReq = {
        params: { workspaceId: "507f1f77bcf86cd799439011" },
        user: { _id: "user-1" },
        body: {}
    };
    const workspaceRes = createResponse();
    await middleware(workspaceReq, workspaceRes, jest.fn());

    expect(workspaceRes.statusCode).toBe(403);
    expect(workspaceRes.body).toEqual({
        message: "Only workspace owners and admins can create tasks"
    });

    const projectReq = {
        params: {
            workspaceId: "507f1f77bcf86cd799439011",
            projectId: "507f1f77bcf86cd799439012"
        },
        user: { _id: "user-1" },
        body: {}
    };
    const projectRes = createResponse();
    await middleware(projectReq, projectRes, jest.fn());

    expect(projectRes.statusCode).toBe(403);
    expect(projectRes.body).toEqual({
        message: "Only workspace owners/admins, project admins, or assigned team leads can create tasks in this project"
    });
});

test("checkCanCreateTask forwards unexpected errors to next", async () => {
    const error = new Error("permission service unavailable");
    canCreateTask.mockRejectedValue(error);

    const middleware = checkCanCreateTask();
    const next = jest.fn();

    await middleware(
        {
            params: { workspaceId: "507f1f77bcf86cd799439011" },
            user: { _id: "user-1" },
            body: {}
        },
        createResponse(),
        next
    );

    expect(next).toHaveBeenCalledWith(error);
});
