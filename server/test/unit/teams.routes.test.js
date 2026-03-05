const mockRouter = {
    use: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    get: jest.fn()
};

jest.mock("express", () => ({
    Router: jest.fn(() => mockRouter)
}));

jest.mock("../../src/middleware/authMiddleware", () => "auth-middleware");
jest.mock("../../src/middleware/checkRoleMiddleware", () => ({
    checkWorkspaceMemberRole: jest.fn(() => "workspace-role-middleware")
}));
jest.mock("../../src/modules/team/teams.controller", () => ({
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

const authMiddleware = require("../../src/middleware/authMiddleware");
const { checkWorkspaceMemberRole } = require("../../src/middleware/checkRoleMiddleware");
const controller = require("../../src/modules/team/teams.controller");
const router = require("../../src/modules/team/teams.routes");

test("team routes register expected paths with role middleware", () => {
    expect(router).toBe(mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith(authMiddleware);

    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(1, "owner", "admin");
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/teams",
        "workspace-role-middleware",
        controller.createTeam
    );

    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(2, "owner", "admin", "member", "viewer");
    expect(mockRouter.get).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/teams",
        "workspace-role-middleware",
        controller.getTeamsByWorkspace
    );

    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(3, "owner", "admin", "member", "viewer");
    expect(mockRouter.get).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/team/:teamId",
        "workspace-role-middleware",
        controller.getTeamById
    );

    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(4, "owner", "admin");
    expect(mockRouter.patch).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/team/:teamId",
        "workspace-role-middleware",
        controller.updateTeam
    );

    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(5, "owner", "admin");
    expect(mockRouter.delete).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/team/:teamId",
        "workspace-role-middleware",
        controller.deleteTeam
    );

    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(6, "owner", "admin");
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/team/:teamId/members",
        "workspace-role-middleware",
        controller.addTeamMember
    );

    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(7, "owner", "admin", "member", "viewer");
    expect(mockRouter.get).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/team/:teamId/members",
        "workspace-role-middleware",
        controller.getTeamMembers
    );

    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(8, "owner", "admin");
    expect(mockRouter.delete).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/team/:teamId/members/:memberId",
        "workspace-role-middleware",
        controller.removeTeamMember
    );

    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(9, "owner", "admin");
    expect(mockRouter.patch).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/team/:teamId/members/:memberId/role",
        "workspace-role-middleware",
        controller.updateTeamMemberRole
    );

    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(10, "owner", "admin", "member", "viewer");
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/team/:teamId/leave",
        "workspace-role-middleware",
        controller.leaveTeam
    );
});
