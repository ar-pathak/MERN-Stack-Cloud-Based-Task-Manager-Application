jest.mock("../../src/modules/workspace/workspace.service", () => ({
    createWorkspace: jest.fn(),
    getAllWorkspaces: jest.fn(),
    getWorkspaceById: jest.fn(),
    updateWorkspace: jest.fn(),
    deleteWorkspace: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
    getMembers: jest.fn(),
    sendInvite: jest.fn(),
    acceptInvite: jest.fn(),
    respondInvite: jest.fn(),
    leaveWorkspace: jest.fn(),
    transferOwnership: jest.fn(),
    getQuickStatus: jest.fn(),
    toggleStar: jest.fn(),
    toggleMute: jest.fn(),
    toggleArchive: jest.fn()
}));

jest.mock("../../src/modules/workspace/workspace.validation", () => ({
    createWorkspaceSchema: { parse: jest.fn((value) => value) },
    updateWorkspaceSchema: { parse: jest.fn((value) => value) },
    updateMemberRoleSchema: { parse: jest.fn((value) => value) },
    sendInviteSchema: { parse: jest.fn((value) => value) },
    addMemberSchema: { parse: jest.fn((value) => value) },
    transferOwnershipSchema: { parse: jest.fn((value) => value) },
    respondInviteSchema: { parse: jest.fn((value) => value) }
}));

jest.mock("../../src/helpers/paginationHelper", () => ({
    parsePaginationQuery: jest.fn(() => ({ page: 1, limit: 20, skip: 0 }))
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

const workspaceService = require("../../src/modules/workspace/workspace.service");
const {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    updateMemberRoleSchema,
    sendInviteSchema,
    addMemberSchema,
    transferOwnershipSchema,
    respondInviteSchema
} = require("../../src/modules/workspace/workspace.validation");
const { parsePaginationQuery } = require("../../src/helpers/paginationHelper");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const controller = require("../../src/modules/workspace/workspace.controller");

const USER_ID = "507f1f77bcf86cd799439011";
const WORKSPACE_ID = "507f1f77bcf86cd799439012";
const MEMBER_ID = "507f1f77bcf86cd799439013";
const INVITE_ID = "507f1f77bcf86cd799439014";
const TOKEN = "a".repeat(64);

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
    user: { _id: USER_ID },
    params: {
        id: WORKSPACE_ID,
        workspaceId: WORKSPACE_ID,
        memberId: MEMBER_ID,
        inviteId: INVITE_ID,
        token: TOKEN
    },
    query: { page: "1", limit: "20" },
    body: {
        name: "Workspace A",
        description: "Primary workspace",
        role: "member",
        userId: MEMBER_ID,
        username: "member",
        email: "member@example.com",
        action: "accept",
        newOwnerId: MEMBER_ID
    },
    file: null
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("create/get/update/delete workspace handlers forward correctly", async () => {
    const createReq = baseReq();
    const createRes = createResponse();
    const created = { _id: WORKSPACE_ID, name: "Workspace A" };
    workspaceService.createWorkspace.mockResolvedValue(created);

    await controller.createWorkspace(createReq, createRes);

    expect(createWorkspaceSchema.parse).toHaveBeenCalledWith(createReq.body);
    expect(workspaceService.createWorkspace).toHaveBeenCalledWith({
        ...createReq.body,
        ownerId: USER_ID
    });
    expect(sendSuccess).toHaveBeenCalledWith(createRes, created, "Workspace created successfully", 201);

    const listReq = baseReq();
    const listRes = createResponse();
    const listPayload = { items: [created] };
    workspaceService.getAllWorkspaces.mockResolvedValue(listPayload);

    await controller.getAllWorkspaces(listReq, listRes);

    expect(parsePaginationQuery).toHaveBeenCalledWith(listReq.query, {
        defaultLimit: 20,
        maxLimit: 100
    });
    expect(workspaceService.getAllWorkspaces).toHaveBeenCalledWith(
        USER_ID,
        { page: 1, limit: 20, skip: 0 }
    );
    expect(sendSuccess).toHaveBeenCalledWith(listRes, listPayload, "Workspaces retrieved successfully");

    const getReq = baseReq();
    const getRes = createResponse();
    workspaceService.getWorkspaceById.mockResolvedValue(created);

    await controller.getWorkspaceById(getReq, getRes);

    expect(workspaceService.getWorkspaceById).toHaveBeenCalledWith(WORKSPACE_ID, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(getRes, created, "Workspace retrieved successfully");

    const updateReq = baseReq();
    const updateRes = createResponse();
    const updated = { _id: WORKSPACE_ID, name: "Updated Workspace" };
    workspaceService.updateWorkspace.mockResolvedValue(updated);

    await controller.updateWorkspace(updateReq, updateRes);

    expect(updateWorkspaceSchema.parse).toHaveBeenCalledWith(updateReq.body);
    expect(workspaceService.updateWorkspace).toHaveBeenCalledWith(
        WORKSPACE_ID,
        updateReq.body,
        USER_ID
    );
    expect(sendSuccess).toHaveBeenCalledWith(updateRes, updated, "Workspace updated successfully");

    const deleteReq = baseReq();
    const deleteRes = createResponse();
    workspaceService.deleteWorkspace.mockResolvedValue();

    await controller.deleteWorkspace(deleteReq, deleteRes);

    expect(workspaceService.deleteWorkspace).toHaveBeenCalledWith(WORKSPACE_ID, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(deleteRes, null, "Workspace deleted successfully");
});

test("member management handlers validate payload and return responses", async () => {
    const addReq = baseReq();
    const addRes = createResponse();
    const addResult = { mode: "direct_add", userId: MEMBER_ID };
    workspaceService.addMember.mockResolvedValue(addResult);

    await controller.addMember(addReq, addRes);

    expect(addMemberSchema.parse).toHaveBeenCalledWith(addReq.body);
    expect(workspaceService.addMember).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        userId: MEMBER_ID,
        username: "member",
        email: "member@example.com",
        role: "member",
        requesterId: USER_ID
    });
    expect(sendSuccess).toHaveBeenCalledWith(addRes, addResult, "Member added successfully", 201);

    const inviteModeReq = baseReq();
    const inviteModeRes = createResponse();
    workspaceService.addMember.mockResolvedValue({ mode: "invite_request" });

    await controller.addMember(inviteModeReq, inviteModeRes);

    expect(sendSuccess).toHaveBeenLastCalledWith(
        inviteModeRes,
        { mode: "invite_request" },
        "Invite request sent successfully",
        201
    );

    const removeReq = baseReq();
    const removeRes = createResponse();
    workspaceService.removeMember.mockResolvedValue();

    await controller.removeMember(removeReq, removeRes);

    expect(workspaceService.removeMember).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        memberId: MEMBER_ID,
        requesterId: USER_ID
    });
    expect(sendSuccess).toHaveBeenCalledWith(removeRes, null, "Member removed successfully");

    const roleReq = baseReq();
    const roleRes = createResponse();
    roleReq.body = { role: "admin" };
    workspaceService.updateMemberRole.mockResolvedValue({ updated: true });

    await controller.updateMemberRole(roleReq, roleRes);

    expect(updateMemberRoleSchema.parse).toHaveBeenCalledWith({ role: "admin" });
    expect(workspaceService.updateMemberRole).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        memberId: MEMBER_ID,
        role: "admin",
        requesterId: USER_ID
    });
    expect(sendSuccess).toHaveBeenCalledWith(
        roleRes,
        { updated: true },
        "Member role updated successfully"
    );

    const getMembersReq = baseReq();
    const getMembersRes = createResponse();
    workspaceService.getMembers.mockResolvedValue({ items: [] });

    await controller.getMembers(getMembersReq, getMembersRes);

    expect(parsePaginationQuery).toHaveBeenCalledWith(getMembersReq.query, {
        defaultLimit: 25,
        maxLimit: 100
    });
    expect(workspaceService.getMembers).toHaveBeenCalledWith(
        WORKSPACE_ID,
        { page: 1, limit: 20, skip: 0 }
    );
    expect(sendSuccess).toHaveBeenCalledWith(
        getMembersRes,
        { items: [] },
        "Members retrieved successfully"
    );
});

test("invite lifecycle handlers process token and action", async () => {
    const sendReq = baseReq();
    const sendRes = createResponse();
    sendReq.body = { email: "invitee@example.com", role: "member" };
    const invite = { id: INVITE_ID };
    workspaceService.sendInvite.mockResolvedValue(invite);

    await controller.sendInvite(sendReq, sendRes);

    expect(sendInviteSchema.parse).toHaveBeenCalledWith(sendReq.body);
    expect(workspaceService.sendInvite).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        email: "invitee@example.com",
        role: "member",
        invitedBy: USER_ID,
        csvBuffer: null
    });
    expect(sendSuccess).toHaveBeenCalledWith(sendRes, invite, "Invite processed successfully", 201);

    const acceptReq = baseReq();
    const acceptRes = createResponse();
    const workspace = { _id: WORKSPACE_ID, name: "Workspace A" };
    workspaceService.acceptInvite.mockResolvedValue(workspace);

    await controller.acceptInvite(acceptReq, acceptRes);

    expect(workspaceService.acceptInvite).toHaveBeenCalledWith(TOKEN, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(
        acceptRes,
        { workspaceId: WORKSPACE_ID, workspace },
        "Invite accepted successfully"
    );

    const respondReq = baseReq();
    const respondRes = createResponse();
    respondReq.body = { action: "accept" };
    const respondResult = { accepted: true };
    workspaceService.respondInvite.mockResolvedValue(respondResult);

    await controller.respondInvite(respondReq, respondRes);

    expect(respondInviteSchema.parse).toHaveBeenCalledWith({ action: "accept" });
    expect(workspaceService.respondInvite).toHaveBeenCalledWith({
        inviteId: INVITE_ID,
        userId: USER_ID,
        action: "accept"
    });
    expect(sendSuccess).toHaveBeenCalledWith(
        respondRes,
        respondResult,
        "Workspace invite accepted"
    );
});

test("quick actions and ownership handlers forward and map dynamic messages", async () => {
    const leaveReq = baseReq();
    const leaveRes = createResponse();
    workspaceService.leaveWorkspace.mockResolvedValue();

    await controller.leaveWorkspace(leaveReq, leaveRes);

    expect(workspaceService.leaveWorkspace).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID
    });
    expect(sendSuccess).toHaveBeenCalledWith(leaveRes, null, "Successfully left workspace");

    const transferReq = baseReq();
    const transferRes = createResponse();
    transferReq.body = { newOwnerId: MEMBER_ID };
    workspaceService.transferOwnership.mockResolvedValue();

    await controller.transferOwnership(transferReq, transferRes);

    expect(transferOwnershipSchema.parse).toHaveBeenCalledWith({ newOwnerId: MEMBER_ID });
    expect(workspaceService.transferOwnership).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        newOwnerId: MEMBER_ID,
        currentOwnerId: USER_ID
    });
    expect(sendSuccess).toHaveBeenCalledWith(transferRes, null, "Ownership transferred successfully");

    const quickReq = baseReq();
    const quickRes = createResponse();
    workspaceService.getQuickStatus.mockResolvedValue({ isStarred: false });
    await controller.getQuickStatus(quickReq, quickRes);
    expect(sendSuccess).toHaveBeenCalledWith(quickRes, { isStarred: false }, "Quick actions status retrieved");

    const starReq = baseReq();
    const starRes = createResponse();
    workspaceService.toggleStar.mockResolvedValue({ isStarred: true });
    await controller.toggleStar(starReq, starRes);
    expect(sendSuccess).toHaveBeenCalledWith(starRes, { isStarred: true }, "Workspace starred");

    const muteReq = baseReq();
    const muteRes = createResponse();
    workspaceService.toggleMute.mockResolvedValue({ isMuted: false });
    await controller.toggleMute(muteReq, muteRes);
    expect(sendSuccess).toHaveBeenCalledWith(muteRes, { isMuted: false }, "Workspace unmuted");

    const archiveReq = baseReq();
    const archiveRes = createResponse();
    workspaceService.toggleArchive.mockResolvedValue({ status: "archived" });
    await controller.toggleArchive(archiveReq, archiveRes);
    expect(sendSuccess).toHaveBeenCalledWith(archiveRes, { status: "archived" }, "Workspace archived");
});

test("sendInvite validates presence of email/csv and acceptInvite validates token", async () => {
    const sendReq = baseReq();
    const sendRes = createResponse();
    sendReq.body = {};

    await controller.sendInvite(sendReq, sendRes);

    expect(sendRes.statusCode).toBe(400);
    expect(sendRes.body).toEqual({
        success: false,
        message: "Provide an email or upload a CSV file"
    });

    const acceptReq = baseReq();
    const acceptRes = createResponse();
    acceptReq.params.token = "short-token";

    await controller.acceptInvite(acceptReq, acceptRes);

    expect(acceptRes.statusCode).toBe(400);
    expect(acceptRes.body).toEqual({
        success: false,
        message: "Invalid invite token"
    });
});

test("handlers return 400 for invalid workspace/member/invite ids", async () => {
    const invalidWorkspaceReq = baseReq();
    invalidWorkspaceReq.params.workspaceId = "invalid";
    invalidWorkspaceReq.params.id = "invalid";
    const invalidWorkspaceRes = createResponse();

    await controller.getWorkspaceById(invalidWorkspaceReq, invalidWorkspaceRes);

    expect(invalidWorkspaceRes.statusCode).toBe(400);
    expect(invalidWorkspaceRes.body).toEqual({
        success: false,
        message: "Invalid workspace ID"
    });

    const invalidMemberReq = baseReq();
    invalidMemberReq.params.memberId = "invalid";
    const invalidMemberRes = createResponse();

    await controller.removeMember(invalidMemberReq, invalidMemberRes);

    expect(invalidMemberRes.statusCode).toBe(400);
    expect(invalidMemberRes.body).toEqual({
        success: false,
        message: "Invalid member ID"
    });

    const invalidInviteReq = baseReq();
    invalidInviteReq.params.inviteId = "invalid";
    const invalidInviteRes = createResponse();

    await controller.respondInvite(invalidInviteReq, invalidInviteRes);

    expect(invalidInviteRes.statusCode).toBe(400);
    expect(invalidInviteRes.body).toEqual({
        success: false,
        message: "Invalid invite ID"
    });
});

test("controller delegates service exceptions to handleError", async () => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("access denied");
    error.statusCode = 403;
    workspaceService.getAllWorkspaces.mockRejectedValue(error);

    await controller.getAllWorkspaces(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
        success: false,
        message: "access denied"
    });
});

test.each([
    ["updateWorkspace", (req) => { req.params.id = "invalid"; }, "Invalid workspace ID"],
    ["deleteWorkspace", (req) => { req.params.id = "invalid"; }, "Invalid workspace ID"],
    ["addMember", (req) => { req.params.workspaceId = "invalid"; }, "Invalid workspace ID"],
    ["removeMember", (req) => { req.params.workspaceId = "invalid"; }, "Invalid workspace ID"],
    ["updateMemberRole", (req) => { req.params.workspaceId = "invalid"; }, "Invalid workspace ID"],
    ["getMembers", (req) => { req.params.workspaceId = "invalid"; }, "Invalid workspace ID"],
    ["sendInvite", (req) => { req.params.workspaceId = "invalid"; req.body = { email: "a@b.com" }; }, "Invalid workspace ID"],
    ["leaveWorkspace", (req) => { req.params.workspaceId = "invalid"; }, "Invalid workspace ID"],
    ["transferOwnership", (req) => { req.params.workspaceId = "invalid"; }, "Invalid workspace ID"],
    ["getQuickStatus", (req) => { req.params.workspaceId = "invalid"; }, "Invalid workspace ID"],
    ["toggleStar", (req) => { req.params.workspaceId = "invalid"; }, "Invalid workspace ID"],
    ["toggleMute", (req) => { req.params.workspaceId = "invalid"; }, "Invalid workspace ID"],
    ["toggleArchive", (req) => { req.params.workspaceId = "invalid"; }, "Invalid workspace ID"]
])("%s returns 400 on invalid workspace id", async (handlerName, mutateReq, expectedMessage) => {
    const req = baseReq();
    const res = createResponse();
    mutateReq(req);

    await controller[handlerName](req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: expectedMessage
    });
});

test("updateMemberRole returns 400 for invalid member id", async () => {
    const req = baseReq();
    const res = createResponse();
    req.params.memberId = "invalid";

    await controller.updateMemberRole(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
        success: false,
        message: "Invalid member ID"
    });
});

test.each([
    ["createWorkspace", (err) => { workspaceService.createWorkspace.mockRejectedValue(err); }],
    ["getWorkspaceById", (err) => { workspaceService.getWorkspaceById.mockRejectedValue(err); }],
    ["updateWorkspace", (err) => { workspaceService.updateWorkspace.mockRejectedValue(err); }],
    ["deleteWorkspace", (err) => { workspaceService.deleteWorkspace.mockRejectedValue(err); }],
    ["addMember", (err) => { workspaceService.addMember.mockRejectedValue(err); }],
    ["removeMember", (err) => { workspaceService.removeMember.mockRejectedValue(err); }],
    ["updateMemberRole", (err) => { workspaceService.updateMemberRole.mockRejectedValue(err); }],
    ["getMembers", (err) => { workspaceService.getMembers.mockRejectedValue(err); }],
    ["sendInvite", (err) => { workspaceService.sendInvite.mockRejectedValue(err); }],
    ["acceptInvite", (err) => { workspaceService.acceptInvite.mockRejectedValue(err); }],
    ["respondInvite", (err) => { workspaceService.respondInvite.mockRejectedValue(err); }],
    ["leaveWorkspace", (err) => { workspaceService.leaveWorkspace.mockRejectedValue(err); }],
    ["transferOwnership", (err) => { workspaceService.transferOwnership.mockRejectedValue(err); }],
    ["getQuickStatus", (err) => { workspaceService.getQuickStatus.mockRejectedValue(err); }],
    ["toggleStar", (err) => { workspaceService.toggleStar.mockRejectedValue(err); }],
    ["toggleMute", (err) => { workspaceService.toggleMute.mockRejectedValue(err); }],
    ["toggleArchive", (err) => { workspaceService.toggleArchive.mockRejectedValue(err); }]
])("%s delegates thrown service error to handleError", async (handlerName, setupFailure) => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error(`${handlerName} failed`);
    error.statusCode = 422;

    if (handlerName === "sendInvite") {
        req.body = { email: "invitee@example.com", role: "member" };
    }

    setupFailure(error);
    await controller[handlerName](req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
        success: false,
        message: `${handlerName} failed`
    });
});
