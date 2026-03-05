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
    checkWorkspaceMemberRole: jest.fn(() => "workspace-role-middleware"),
    checkCanCreateTask: jest.fn(() => "create-task-middleware")
}));
jest.mock("../../src/modules/tasks/tasks.controller", () => ({
    createTaskAtGlobalLevel: jest.fn(),
    createTaskAtWorkspaceLevel: jest.fn(),
    createTaskAtProjectLevel: jest.fn(),
    updateTask: jest.fn(),
    addTaskAssignees: jest.fn(),
    respondTaskAssigneeRequest: jest.fn(),
    removeTaskAssignees: jest.fn(),
    changeTaskStatus: jest.fn(),
    toggleTaskCompletion: jest.fn(),
    deleteTask: jest.fn(),
    restoreTask: jest.fn(),
    permanentDeleteTask: jest.fn(),
    getAllGlobalLevelTasks: jest.fn(),
    getTask: jest.fn(),
    getTasksByWorkspace: jest.fn(),
    getTasksByProject: jest.fn(),
    leaveTask: jest.fn()
}));

const authMiddleware = require("../../src/middleware/authMiddleware");
const {
    checkWorkspaceMemberRole,
    checkCanCreateTask
} = require("../../src/middleware/checkRoleMiddleware");
const controller = require("../../src/modules/tasks/tasks.controller");
const router = require("../../src/modules/tasks/tasks.routes");

test("tasks routes register all endpoints and middleware", () => {
    expect(router).toBe(mockRouter);
    expect(mockRouter.use).toHaveBeenCalledWith(authMiddleware);

    expect(checkCanCreateTask).toHaveBeenCalledTimes(2);
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/createTasksAtGlobalLevel",
        controller.createTaskAtGlobalLevel
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/workspace/:workspaceId/createTasksAtWorkspaceLevel",
        "create-task-middleware",
        controller.createTaskAtWorkspaceLevel
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/workspace/:workspaceId/project/:projectId/createTasksAtProjectLevel",
        "create-task-middleware",
        controller.createTaskAtProjectLevel
    );

    expect(mockRouter.patch).toHaveBeenCalledWith("/:taskId/update", controller.updateTask);
    expect(mockRouter.patch).toHaveBeenCalledWith("/:taskId/assignees/add", controller.addTaskAssignees);
    expect(mockRouter.post).toHaveBeenCalledWith(
        "/:taskId/assignees/requests/:requestId/respond",
        controller.respondTaskAssigneeRequest
    );
    expect(mockRouter.delete).toHaveBeenCalledWith("/:taskId/assignees/remove", controller.removeTaskAssignees);
    expect(mockRouter.patch).toHaveBeenCalledWith("/:taskId/status", controller.changeTaskStatus);
    expect(mockRouter.patch).toHaveBeenCalledWith("/:taskId/toggle", controller.toggleTaskCompletion);
    expect(mockRouter.delete).toHaveBeenCalledWith("/:taskId/softDelete", controller.deleteTask);
    expect(mockRouter.patch).toHaveBeenCalledWith("/:taskId/restore", controller.restoreTask);
    expect(mockRouter.delete).toHaveBeenCalledWith("/:taskId/permanentDelete", controller.permanentDeleteTask);
    expect(mockRouter.get).toHaveBeenCalledWith("/getAllGlobalLevelTasks", controller.getAllGlobalLevelTasks);
    expect(mockRouter.get).toHaveBeenCalledWith("/:taskId", controller.getTask);

    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(1, "owner", "admin", "member", "viewer");
    expect(checkWorkspaceMemberRole).toHaveBeenNthCalledWith(2, "owner", "admin", "member", "viewer");
    expect(mockRouter.get).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/tasks",
        "workspace-role-middleware",
        controller.getTasksByWorkspace
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
        "/workspaces/:workspaceId/projects/:projectId/tasks",
        "workspace-role-middleware",
        controller.getTasksByProject
    );
    expect(mockRouter.post).toHaveBeenCalledWith("/:taskId/leave", controller.leaveTask);
});
