const mockRouter = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
};

jest.mock("express", () => ({
    Router: jest.fn(() => mockRouter)
}));

jest.mock("../../src/middleware/authMiddleware", () => "auth-middleware");
jest.mock("../../src/middleware/checkRoleMiddleware", () => ({
    checkWorkspaceMemberRole: jest.fn(() => "workspace-role-middleware")
}));
jest.mock("../../src/modules/projects/project.controller", () => ({
    createProject: jest.fn(),
    getProjectsByWorkspace: jest.fn(),
    getProjectById: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
    requestProjectStatusChange: jest.fn(),
    respondProjectStatusChangeRequest: jest.fn(),
    getProjectTeams: jest.fn(),
    addProjectTeams: jest.fn(),
    removeProjectTeams: jest.fn(),
    getProjectMembers: jest.fn(),
    addProjectMembers: jest.fn(),
    removeProjectMembers: jest.fn(),
    updateProjectMemberRole: jest.fn(),
    leaveProject: jest.fn()
}));

const authMiddleware = require("../../src/middleware/authMiddleware");
const { checkWorkspaceMemberRole } = require("../../src/middleware/checkRoleMiddleware");
const controller = require("../../src/modules/projects/project.controller");
const router = require("../../src/modules/projects/project.routes");

test("project routes register endpoints with auth and role guards", () => {
    expect(router).toBe(mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith(authMiddleware);

    expect(mockRouter.post).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/projects",
        "workspace-role-middleware",
        controller.createProject
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/projects",
        "workspace-role-middleware",
        controller.getProjectsByWorkspace
    );
    expect(mockRouter.get).toHaveBeenCalledWith("/:projectId", controller.getProjectById);
    expect(mockRouter.patch).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/projects/:projectId",
        "workspace-role-middleware",
        controller.updateProject
    );
    expect(mockRouter.delete).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/projects/:projectId",
        "workspace-role-middleware",
        controller.deleteProject
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/projects/:projectId/status-requests",
        "workspace-role-middleware",
        controller.requestProjectStatusChange
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/projects/:projectId/status-requests/:requestId/respond",
        "workspace-role-middleware",
        controller.respondProjectStatusChangeRequest
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/projects/:projectId/leave",
        "workspace-role-middleware",
        controller.leaveProject
    );
    expect(checkWorkspaceMemberRole).toHaveBeenCalled();
});
