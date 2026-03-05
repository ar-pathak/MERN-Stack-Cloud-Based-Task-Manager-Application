jest.mock("../../src/modules/projects/project.service", () => ({
    createProject: jest.fn(),
    getProjectsByWorkspace: jest.fn(),
    getProjectById: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
    getProjectTeams: jest.fn(),
    addProjectTeams: jest.fn(),
    removeProjectTeams: jest.fn(),
    getProjectMembers: jest.fn(),
    addProjectMembers: jest.fn(),
    removeProjectMembers: jest.fn(),
    updateProjectMemberRole: jest.fn(),
    requestProjectStatusChange: jest.fn(),
    respondProjectStatusChangeRequest: jest.fn(),
    leaveProject: jest.fn()
}));

jest.mock("../../src/modules/projects/project.validation", () => ({
    createProjectSchema: { parse: jest.fn((value) => value) },
    updateProjectSchema: { parse: jest.fn((value) => value) },
    addProjectTeamsSchema: { parse: jest.fn((value) => value) },
    removeProjectTeamsSchema: { parse: jest.fn((value) => value) },
    addProjectMembersSchema: { parse: jest.fn((value) => value) },
    removeProjectMembersSchema: { parse: jest.fn((value) => value) },
    updateProjectMemberRoleSchema: { parse: jest.fn((value) => value) },
    requestProjectStatusChangeSchema: { parse: jest.fn((value) => value) },
    respondProjectStatusChangeRequestSchema: { parse: jest.fn((value) => value) }
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

const projectService = require("../../src/modules/projects/project.service");
const {
    createProjectSchema,
    updateProjectSchema,
    addProjectTeamsSchema,
    removeProjectTeamsSchema,
    addProjectMembersSchema,
    removeProjectMembersSchema,
    updateProjectMemberRoleSchema,
    requestProjectStatusChangeSchema,
    respondProjectStatusChangeRequestSchema
} = require("../../src/modules/projects/project.validation");
const { parsePaginationQuery } = require("../../src/helpers/paginationHelper");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const controller = require("../../src/modules/projects/project.controller");

const USER_ID = "507f1f77bcf86cd799439011";
const WORKSPACE_ID = "507f1f77bcf86cd799439012";
const PROJECT_ID = "507f1f77bcf86cd799439013";
const MEMBER_ID = "507f1f77bcf86cd799439014";
const REQUEST_ID = "507f1f77bcf86cd799439015";

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
        workspaceId: WORKSPACE_ID,
        projectId: PROJECT_ID,
        memberId: MEMBER_ID,
        requestId: REQUEST_ID
    },
    query: { page: "1", limit: "20" },
    body: {
        name: "Project A",
        description: "Project description",
        teams: ["team-1"],
        members: [USER_ID],
        users: [USER_ID],
        role: "member",
        status: "completed",
        note: "Done",
        action: "approve"
    }
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("create/get/update/delete project handlers call service and return messages", async () => {
    const createReq = baseReq();
    const createRes = createResponse();
    const created = { _id: PROJECT_ID };
    projectService.createProject.mockResolvedValue(created);

    await controller.createProject(createReq, createRes);

    expect(createProjectSchema.parse).toHaveBeenCalledWith(createReq.body);
    expect(projectService.createProject).toHaveBeenCalledWith({
        data: createReq.body,
        workspaceId: WORKSPACE_ID,
        userId: USER_ID
    });
    expect(sendSuccess).toHaveBeenCalledWith(createRes, created, "Project created successfully", 201);

    const listReq = baseReq();
    const listRes = createResponse();
    const listPayload = { items: [created] };
    projectService.getProjectsByWorkspace.mockResolvedValue(listPayload);

    await controller.getProjectsByWorkspace(listReq, listRes);

    expect(parsePaginationQuery).toHaveBeenCalledWith(listReq.query, {
        defaultLimit: 20,
        maxLimit: 100
    });
    expect(projectService.getProjectsByWorkspace).toHaveBeenCalledWith(
        WORKSPACE_ID,
        USER_ID,
        { page: 1, limit: 20, skip: 0 }
    );
    expect(sendSuccess).toHaveBeenCalledWith(listRes, listPayload, "Projects retrieved successfully");

    const getReq = baseReq();
    const getRes = createResponse();
    projectService.getProjectById.mockResolvedValue(created);

    await controller.getProjectById(getReq, getRes);

    expect(projectService.getProjectById).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(getRes, created, "Project retrieved successfully");

    const updateReq = baseReq();
    const updateRes = createResponse();
    const updated = { _id: PROJECT_ID, name: "Updated" };
    projectService.updateProject.mockResolvedValue(updated);

    await controller.updateProject(updateReq, updateRes);

    expect(updateProjectSchema.parse).toHaveBeenCalledWith(updateReq.body);
    expect(projectService.updateProject).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        workspaceId: WORKSPACE_ID,
        updateData: updateReq.body,
        userId: USER_ID
    });
    expect(sendSuccess).toHaveBeenCalledWith(updateRes, updated, "Project updated successfully");

    const deleteReq = baseReq();
    const deleteRes = createResponse();
    projectService.deleteProject.mockResolvedValue({ message: "Project deleted successfully" });

    await controller.deleteProject(deleteReq, deleteRes);

    expect(projectService.deleteProject).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(deleteRes, null, "Project deleted successfully");
});

test("team and member handlers validate body and return service messages", async () => {
    const reqTeams = baseReq();
    const resTeams = createResponse();
    const teamsPayload = { items: [{ _id: "team-1" }] };
    projectService.getProjectTeams.mockResolvedValue(teamsPayload);

    await controller.getProjectTeams(reqTeams, resTeams);

    expect(projectService.getProjectTeams).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resTeams, teamsPayload, "Teams retrieved successfully");

    const reqAddTeams = baseReq();
    const resAddTeams = createResponse();
    projectService.addProjectTeams.mockResolvedValue({ message: "Teams added" });

    await controller.addProjectTeams(reqAddTeams, resAddTeams);

    expect(addProjectTeamsSchema.parse).toHaveBeenCalledWith(reqAddTeams.body);
    expect(projectService.addProjectTeams).toHaveBeenCalledWith(PROJECT_ID, reqAddTeams.body, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resAddTeams, null, "Teams added");

    const reqRemoveTeams = baseReq();
    const resRemoveTeams = createResponse();
    projectService.removeProjectTeams.mockResolvedValue({ message: "Teams removed" });

    await controller.removeProjectTeams(reqRemoveTeams, resRemoveTeams);

    expect(removeProjectTeamsSchema.parse).toHaveBeenCalledWith(reqRemoveTeams.body);
    expect(projectService.removeProjectTeams).toHaveBeenCalledWith(PROJECT_ID, reqRemoveTeams.body, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resRemoveTeams, null, "Teams removed");

    const reqMembers = baseReq();
    const resMembers = createResponse();
    const membersPayload = { items: [{ _id: USER_ID }] };
    projectService.getProjectMembers.mockResolvedValue(membersPayload);

    await controller.getProjectMembers(reqMembers, resMembers);

    expect(projectService.getProjectMembers).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resMembers, membersPayload, "Members retrieved successfully");

    const reqAddMembers = baseReq();
    const resAddMembers = createResponse();
    projectService.addProjectMembers.mockResolvedValue({ message: "Members added" });

    await controller.addProjectMembers(reqAddMembers, resAddMembers);

    expect(addProjectMembersSchema.parse).toHaveBeenCalledWith(reqAddMembers.body);
    expect(projectService.addProjectMembers).toHaveBeenCalledWith(PROJECT_ID, reqAddMembers.body, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resAddMembers, null, "Members added");

    const reqRemoveMembers = baseReq();
    const resRemoveMembers = createResponse();
    projectService.removeProjectMembers.mockResolvedValue({ message: "Members removed" });

    await controller.removeProjectMembers(reqRemoveMembers, resRemoveMembers);

    expect(removeProjectMembersSchema.parse).toHaveBeenCalledWith(reqRemoveMembers.body);
    expect(projectService.removeProjectMembers).toHaveBeenCalledWith(PROJECT_ID, reqRemoveMembers.body, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resRemoveMembers, null, "Members removed");

    const reqUpdateRole = baseReq();
    const resUpdateRole = createResponse();
    reqUpdateRole.body = { role: "admin" };
    projectService.updateProjectMemberRole.mockResolvedValue({ message: "Role updated" });

    await controller.updateProjectMemberRole(reqUpdateRole, resUpdateRole);

    expect(updateProjectMemberRoleSchema.parse).toHaveBeenCalledWith({ role: "admin" });
    expect(projectService.updateProjectMemberRole).toHaveBeenCalledWith(PROJECT_ID, MEMBER_ID, "admin", USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(resUpdateRole, null, "Role updated");
});

test("status-change handlers map request and action messages", async () => {
    const reqRequest = baseReq();
    const resRequest = createResponse();
    reqRequest.body = { status: "completed", note: "Done" };
    const changeRequest = { _id: REQUEST_ID, requestedStatus: "completed" };
    projectService.requestProjectStatusChange.mockResolvedValue(changeRequest);

    await controller.requestProjectStatusChange(reqRequest, resRequest);

    expect(requestProjectStatusChangeSchema.parse).toHaveBeenCalledWith({ status: "completed", note: "Done" });
    expect(projectService.requestProjectStatusChange).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        projectId: PROJECT_ID,
        requestedStatus: "completed",
        note: "Done",
        userId: USER_ID
    });
    expect(sendSuccess).toHaveBeenCalledWith(
        resRequest,
        changeRequest,
        "Status change request sent to project admins",
        201
    );

    const reqRespondApprove = baseReq();
    const resRespondApprove = createResponse();
    reqRespondApprove.body = { action: "approve" };
    projectService.respondProjectStatusChangeRequest.mockResolvedValue({ approved: true });

    await controller.respondProjectStatusChangeRequest(reqRespondApprove, resRespondApprove);

    expect(respondProjectStatusChangeRequestSchema.parse).toHaveBeenCalledWith({ action: "approve" });
    expect(projectService.respondProjectStatusChangeRequest).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        projectId: PROJECT_ID,
        requestId: REQUEST_ID,
        action: "approve",
        userId: USER_ID
    });
    expect(sendSuccess).toHaveBeenCalledWith(
        resRespondApprove,
        { approved: true },
        "Status change request approved"
    );

    const reqRespondReject = baseReq();
    const resRespondReject = createResponse();
    reqRespondReject.body = { action: "reject" };
    projectService.respondProjectStatusChangeRequest.mockResolvedValue({ approved: false });

    await controller.respondProjectStatusChangeRequest(reqRespondReject, resRespondReject);

    expect(sendSuccess).toHaveBeenLastCalledWith(
        resRespondReject,
        { approved: false },
        "Status change request rejected"
    );
});

test("leaveProject forwards to service", async () => {
    const req = baseReq();
    const res = createResponse();
    projectService.leaveProject.mockResolvedValue({ message: "Left project" });

    await controller.leaveProject(req, res);

    expect(projectService.leaveProject).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
    expect(sendSuccess).toHaveBeenCalledWith(res, null, "Left project");
});

test("invalid ids are delegated to handleError", async () => {
    const req = baseReq();
    req.params.projectId = "invalid";
    const res = createResponse();

    await controller.getProjectById(req, res);

    expect(handleError).toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
        success: false,
        message: "Invalid project ID"
    });
});

test("controller delegates service errors to handleError", async () => {
    const req = baseReq();
    const res = createResponse();
    const error = new Error("access denied");
    error.statusCode = 403;
    projectService.getProjectsByWorkspace.mockRejectedValue(error);

    await controller.getProjectsByWorkspace(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ success: false, message: "access denied" });
});

test("workspace-scoped handlers reject invalid workspace id", async () => {
    const handlers = [
        ["createProject", projectService.createProject],
        ["getProjectsByWorkspace", projectService.getProjectsByWorkspace],
        ["requestProjectStatusChange", projectService.requestProjectStatusChange],
        ["respondProjectStatusChangeRequest", projectService.respondProjectStatusChangeRequest]
    ];

    for (const [handlerName, serviceSpy] of handlers) {
        const req = baseReq();
        req.params.workspaceId = "invalid-workspace-id";
        const res = createResponse();

        await controller[handlerName](req, res);

        expect(serviceSpy).not.toHaveBeenCalled();
        expect(handleError).toHaveBeenLastCalledWith(expect.any(Error), res);
        expect(res.statusCode).toBe(500);
    }
});

test("project-scoped handlers reject invalid project id", async () => {
    const handlers = [
        ["getProjectById", projectService.getProjectById],
        ["updateProject", projectService.updateProject],
        ["deleteProject", projectService.deleteProject],
        ["getProjectTeams", projectService.getProjectTeams],
        ["addProjectTeams", projectService.addProjectTeams],
        ["removeProjectTeams", projectService.removeProjectTeams],
        ["getProjectMembers", projectService.getProjectMembers],
        ["addProjectMembers", projectService.addProjectMembers],
        ["removeProjectMembers", projectService.removeProjectMembers],
        ["leaveProject", projectService.leaveProject]
    ];

    for (const [handlerName, serviceSpy] of handlers) {
        const req = baseReq();
        req.params.projectId = "invalid-project-id";
        const res = createResponse();

        await controller[handlerName](req, res);

        expect(serviceSpy).not.toHaveBeenCalled();
        expect(handleError).toHaveBeenLastCalledWith(expect.any(Error), res);
        expect(res.statusCode).toBe(500);
    }
});

test("updateProjectMemberRole validates project/member ids", async () => {
    const badProjectReq = baseReq();
    badProjectReq.params.projectId = "bad-project";
    const badProjectRes = createResponse();

    await controller.updateProjectMemberRole(badProjectReq, badProjectRes);

    expect(projectService.updateProjectMemberRole).not.toHaveBeenCalled();
    expect(handleError).toHaveBeenLastCalledWith(expect.any(Error), badProjectRes);
    expect(badProjectRes.body).toEqual({
        success: false,
        message: "Invalid project ID or member ID"
    });

    const badMemberReq = baseReq();
    badMemberReq.params.memberId = "bad-member";
    const badMemberRes = createResponse();

    await controller.updateProjectMemberRole(badMemberReq, badMemberRes);

    expect(projectService.updateProjectMemberRole).not.toHaveBeenCalled();
    expect(handleError).toHaveBeenLastCalledWith(expect.any(Error), badMemberRes);
    expect(badMemberRes.body).toEqual({
        success: false,
        message: "Invalid project ID or member ID"
    });
});

test("respondProjectStatusChangeRequest validates request id", async () => {
    const req = baseReq();
    req.params.requestId = "bad-request-id";
    const res = createResponse();

    await controller.respondProjectStatusChangeRequest(req, res);

    expect(projectService.respondProjectStatusChangeRequest).not.toHaveBeenCalled();
    expect(handleError).toHaveBeenLastCalledWith(expect.any(Error), res);
    expect(res.body).toEqual({
        success: false,
        message: "Invalid workspace ID, project ID, or request ID"
    });
});
