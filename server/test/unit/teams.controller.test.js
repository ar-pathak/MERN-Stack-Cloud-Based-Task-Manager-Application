jest.mock("../../src/modules/team/teams.service", () => ({
    createTeam: jest.fn(),
    getTeamsByWorkspace: jest.fn(),
    getTeamById: jest.fn(),
    updateTeam: jest.fn(),
    deleteTeam: jest.fn(),
    addTeamMember: jest.fn(),
    getTeamMembers: jest.fn(),
    removeTeamMember: jest.fn(),
    updateTeamMemberRole: jest.fn(),
    leaveTeam: jest.fn()
}));

jest.mock("../../src/modules/team/teams.validation", () => ({
    createTeamSchema: { parse: jest.fn((value) => value) },
    updateTeamSchema: { parse: jest.fn((value) => value) },
    addTeamMemberSchema: { parse: jest.fn((value) => value) },
    updateTeamMemberRoleSchema: { parse: jest.fn((value) => value) }
}));

jest.mock("../../src/helpers/paginationHelper", () => ({
    parsePaginationQuery: jest.fn(() => ({ page: 2, limit: 10, skip: 10 }))
}));

jest.mock("../../src/helpers/responseHelper", () => ({
    sendSuccess: jest.fn((res, data = null, message = "Success", statusCode = 200) => (
        res.status(statusCode).json({
            success: true,
            message,
            ...(data !== null ? { data } : {})
        })
    )),
    handleError: jest.fn((error, res) => (
        res.status(error?.statusCode || 500).json({
            success: false,
            message: error?.message || "Internal server error"
        })
    ))
}));

const teamsService = require("../../src/modules/team/teams.service");
const {
    createTeamSchema,
    updateTeamSchema,
    addTeamMemberSchema,
    updateTeamMemberRoleSchema
} = require("../../src/modules/team/teams.validation");
const { parsePaginationQuery } = require("../../src/helpers/paginationHelper");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const controller = require("../../src/modules/team/teams.controller");

const VALID_WORKSPACE_ID = "507f1f77bcf86cd799439011";
const VALID_TEAM_ID = "507f1f77bcf86cd799439012";
const VALID_MEMBER_ID = "507f1f77bcf86cd799439013";

const createResponse = () => {
    const res = { statusCode: null, body: null };
    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    return res;
};

const baseReq = () => ({
    user: { _id: "507f1f77bcf86cd799439099" },
    params: {
        workspaceId: VALID_WORKSPACE_ID,
        teamId: VALID_TEAM_ID,
        memberId: VALID_MEMBER_ID
    },
    query: { page: "2", limit: "10" },
    body: {
        name: "Backend Team",
        description: "Core team",
        memberId: VALID_MEMBER_ID,
        role: "member"
    }
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("createTeam validates payload and creates team", async () => {
    const req = baseReq();
    const res = createResponse();
    const team = { _id: VALID_TEAM_ID, name: "Backend Team" };
    teamsService.createTeam.mockResolvedValue(team);

    await controller.createTeam(req, res);

    expect(createTeamSchema.parse).toHaveBeenCalledWith(req.body);
    expect(teamsService.createTeam).toHaveBeenCalledWith({
        name: req.body.name,
        description: req.body.description,
        workspaceId: VALID_WORKSPACE_ID,
        userId: req.user._id
    });
    expect(sendSuccess).toHaveBeenCalledWith(res, team, "Team created successfully", 201);
});

test("createTeam returns 400 for invalid workspace id", async () => {
    const req = baseReq();
    req.params.workspaceId = "invalid";
    const res = createResponse();

    await controller.createTeam(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ success: false, message: "Invalid workspace ID" });
    expect(teamsService.createTeam).not.toHaveBeenCalled();
});

test("getTeamsByWorkspace parses pagination and returns teams", async () => {
    const req = baseReq();
    const res = createResponse();
    const payload = { items: [{ _id: VALID_TEAM_ID }], total: 1 };
    teamsService.getTeamsByWorkspace.mockResolvedValue(payload);

    await controller.getTeamsByWorkspace(req, res);

    expect(parsePaginationQuery).toHaveBeenCalledWith(req.query, {
        defaultLimit: 20,
        maxLimit: 100
    });
    expect(teamsService.getTeamsByWorkspace).toHaveBeenCalledWith(
        VALID_WORKSPACE_ID,
        { page: 2, limit: 10, skip: 10 }
    );
    expect(sendSuccess).toHaveBeenCalledWith(res, payload, "Teams retrieved successfully");
});

test("getTeamById returns team details", async () => {
    const req = baseReq();
    const res = createResponse();
    const team = { _id: VALID_TEAM_ID };
    teamsService.getTeamById.mockResolvedValue(team);

    await controller.getTeamById(req, res);

    expect(teamsService.getTeamById).toHaveBeenCalledWith(VALID_TEAM_ID, VALID_WORKSPACE_ID);
    expect(sendSuccess).toHaveBeenCalledWith(res, team, "Team retrieved successfully");
});

test("updateTeam validates payload and updates team", async () => {
    const req = baseReq();
    const res = createResponse();
    const updated = { _id: VALID_TEAM_ID, name: "Platform Team" };
    teamsService.updateTeam.mockResolvedValue(updated);

    await controller.updateTeam(req, res);

    expect(updateTeamSchema.parse).toHaveBeenCalledWith(req.body);
    expect(teamsService.updateTeam).toHaveBeenCalledWith(
        VALID_TEAM_ID,
        VALID_WORKSPACE_ID,
        req.body
    );
    expect(sendSuccess).toHaveBeenCalledWith(res, updated, "Team updated successfully");
});

test("deleteTeam forwards to service", async () => {
    const req = baseReq();
    const res = createResponse();
    teamsService.deleteTeam.mockResolvedValue();

    await controller.deleteTeam(req, res);

    expect(teamsService.deleteTeam).toHaveBeenCalledWith(VALID_TEAM_ID, VALID_WORKSPACE_ID);
    expect(sendSuccess).toHaveBeenCalledWith(res, null, "Team deleted successfully");
});

test("addTeamMember validates payload and returns 201", async () => {
    const req = baseReq();
    const res = createResponse();
    const updatedTeam = { _id: VALID_TEAM_ID, members: [VALID_MEMBER_ID] };
    teamsService.addTeamMember.mockResolvedValue(updatedTeam);

    await controller.addTeamMember(req, res);

    expect(addTeamMemberSchema.parse).toHaveBeenCalledWith(req.body);
    expect(teamsService.addTeamMember).toHaveBeenCalledWith(
        VALID_TEAM_ID,
        VALID_WORKSPACE_ID,
        req.body,
        req.user._id
    );
    expect(sendSuccess).toHaveBeenCalledWith(
        res,
        updatedTeam,
        "Member added to team successfully",
        201
    );
});

test("getTeamMembers returns team membership data", async () => {
    const req = baseReq();
    const res = createResponse();
    const payload = { members: [{ _id: VALID_MEMBER_ID }] };
    teamsService.getTeamMembers.mockResolvedValue(payload);

    await controller.getTeamMembers(req, res);

    expect(teamsService.getTeamMembers).toHaveBeenCalledWith(VALID_TEAM_ID, VALID_WORKSPACE_ID);
    expect(sendSuccess).toHaveBeenCalledWith(res, payload, "Team members retrieved successfully");
});

test("removeTeamMember validates member id and removes member", async () => {
    const req = baseReq();
    const res = createResponse();
    const payload = { removed: true };
    teamsService.removeTeamMember.mockResolvedValue(payload);

    await controller.removeTeamMember(req, res);

    expect(teamsService.removeTeamMember).toHaveBeenCalledWith(
        VALID_TEAM_ID,
        VALID_WORKSPACE_ID,
        VALID_MEMBER_ID,
        req.user._id
    );
    expect(sendSuccess).toHaveBeenCalledWith(res, payload, "Member removed from team successfully");
});

test("removeTeamMember returns 400 for invalid member id", async () => {
    const req = baseReq();
    req.params.memberId = "bad-id";
    const res = createResponse();

    await controller.removeTeamMember(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ success: false, message: "Invalid member ID" });
    expect(teamsService.removeTeamMember).not.toHaveBeenCalled();
});

test("updateTeamMemberRole validates role and forwards update", async () => {
    const req = baseReq();
    const res = createResponse();
    const updated = { _id: VALID_TEAM_ID, roleUpdated: true };
    teamsService.updateTeamMemberRole.mockResolvedValue(updated);

    await controller.updateTeamMemberRole(req, res);

    expect(updateTeamMemberRoleSchema.parse).toHaveBeenCalledWith(req.body);
    expect(teamsService.updateTeamMemberRole).toHaveBeenCalledWith(
        VALID_TEAM_ID,
        VALID_WORKSPACE_ID,
        VALID_MEMBER_ID,
        req.body.role,
        req.user._id
    );
    expect(sendSuccess).toHaveBeenCalledWith(res, updated, "Team member role updated successfully");
});

test("leaveTeam validates id and returns service message", async () => {
    const req = baseReq();
    const res = createResponse();
    teamsService.leaveTeam.mockResolvedValue({ message: "Left team successfully" });

    await controller.leaveTeam(req, res);

    expect(teamsService.leaveTeam).toHaveBeenCalledWith(VALID_TEAM_ID, req.user._id);
    expect(sendSuccess).toHaveBeenCalledWith(res, null, "Left team successfully");
});

test("controller delegates thrown errors to handleError", async () => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("denied");
    error.statusCode = 403;
    teamsService.getTeamById.mockRejectedValue(error);

    await controller.getTeamById(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ success: false, message: "denied" });
});

test.each([
    ["getTeamsByWorkspace", "getTeamsByWorkspace"],
    ["updateTeam", "updateTeam"],
    ["deleteTeam", "deleteTeam"],
    ["addTeamMember", "addTeamMember"],
    ["getTeamMembers", "getTeamMembers"],
    ["removeTeamMember", "removeTeamMember"],
    ["updateTeamMemberRole", "updateTeamMemberRole"],
    ["leaveTeam", "leaveTeam"]
])("%s delegates service failures to handleError", async (handlerName, methodName) => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("boom");
    error.statusCode = 500;
    teamsService[methodName].mockRejectedValue(error);

    await controller[handlerName](req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ success: false, message: "boom" });
});

test("getTeamById returns 400 for invalid team id", async () => {
    const req = baseReq();
    req.params.teamId = "invalid-team-id";
    const res = createResponse();

    await controller.getTeamById(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: "Invalid team ID"
    });
    expect(teamsService.getTeamById).not.toHaveBeenCalled();
});

test("updateTeamMemberRole validates team and member ids", async () => {
    const badTeamReq = baseReq();
    badTeamReq.params.teamId = "bad-team";
    const badTeamRes = createResponse();

    await controller.updateTeamMemberRole(badTeamReq, badTeamRes);

    expect(badTeamRes.statusCode).toBe(400);
    expect(badTeamRes.body).toEqual({
        success: false,
        message: "Invalid team ID"
    });

    const badMemberReq = baseReq();
    badMemberReq.params.memberId = "bad-member";
    const badMemberRes = createResponse();

    await controller.updateTeamMemberRole(badMemberReq, badMemberRes);

    expect(badMemberRes.statusCode).toBe(400);
    expect(badMemberRes.body).toEqual({
        success: false,
        message: "Invalid member ID"
    });
});

test("leaveTeam returns 400 for invalid team id", async () => {
    const req = baseReq();
    req.params.teamId = "invalid-team-id";
    const res = createResponse();

    await controller.leaveTeam(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: "Invalid team ID"
    });
    expect(teamsService.leaveTeam).not.toHaveBeenCalled();
});
