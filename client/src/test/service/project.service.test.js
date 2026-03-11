import { beforeEach, expect, test, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("../../config/axios", () => ({
    default: apiMock,
}));

import {
    addProjectMembers,
    addProjectTeams,
    createProject,
    deleteProject,
    getProjectById,
    getProjectMembers,
    getProjectTeams,
    getProjectsByWorkspace,
    leaveProject,
    removeProjectMembers,
    removeProjectTeams,
    requestProjectStatusChange,
    respondProjectStatusChangeRequest,
    updateProject,
    updateProjectMemberRole,
} from "../../service/project.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("project service returns unwrap payloads and defaults", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "p1" }] } });
    await expect(getProjectsByWorkspace("ws-1")).resolves.toEqual([{ id: "p1" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getProjectsByWorkspace("ws-1")).resolves.toEqual([]);

    apiMock.get.mockResolvedValueOnce({ data: { data: { id: "p2" } } });
    await expect(getProjectById("ws-1", "p2")).resolves.toEqual({ id: "p2" });

    apiMock.get.mockResolvedValueOnce({ data: { id: "p3" } });
    await expect(getProjectById("p3")).resolves.toEqual({ id: "p3" });

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "p4" } } });
    await expect(createProject("ws-1", { name: "Alpha" })).resolves.toEqual({ id: "p4" });

    apiMock.patch.mockResolvedValueOnce({ data: { id: "p5" } });
    await expect(updateProject("ws-1", "p5", { name: "Beta" })).resolves.toEqual({ id: "p5" });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "t1" }] } });
    await expect(getProjectTeams("ws-1", "p1")).resolves.toEqual([{ id: "t1" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getProjectTeams("ws-1", "p1")).resolves.toEqual([]);

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(addProjectTeams("ws-1", "p1", ["team-1"])).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(removeProjectTeams("ws-1", "p1", ["team-1"])).resolves.toEqual({ ok: true });
    expect(apiMock.delete).toHaveBeenLastCalledWith(
        "/api/projects/workspaces/ws-1/projects/p1/teams",
        { data: { teams: ["team-1"] } }
    );

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(removeProjectTeams("ws-1", "p1", "team-2")).resolves.toEqual({ ok: true });
    expect(apiMock.delete).toHaveBeenLastCalledWith(
        "/api/projects/workspaces/ws-1/projects/p1/teams",
        { data: { teams: ["team-2"] } }
    );

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "m1" }] } });
    await expect(getProjectMembers("ws-1", "p1")).resolves.toEqual([{ id: "m1" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getProjectMembers("ws-1", "p1")).resolves.toEqual([]);

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(addProjectMembers("ws-1", "p1", { members: ["u1"] })).resolves.toEqual({
        ok: true,
    });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(removeProjectMembers("ws-1", "p1", { members: ["u2"] })).resolves.toEqual({
        ok: true,
    });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(updateProjectMemberRole("ws-1", "p1", "u1", "admin")).resolves.toEqual({
        ok: true,
    });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(leaveProject("ws-1", "p1")).resolves.toEqual({ ok: true });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(requestProjectStatusChange("ws-1", "p1", { status: "hold" })).resolves.toEqual({
        ok: true,
    });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(
        respondProjectStatusChangeRequest("ws-1", "p1", "req-1", "approve")
    ).resolves.toEqual({ ok: true });
});

test("deleteProject resolves workspace IDs when omitted", async () => {
    apiMock.get.mockResolvedValueOnce({
        data: { data: { workspace: { _id: "ws-1" } } },
    });
    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });

    await expect(deleteProject("project-1")).resolves.toEqual({ ok: true });
    expect(apiMock.get).toHaveBeenCalledWith("/api/projects/project-1");
    expect(apiMock.delete).toHaveBeenCalledWith(
        "/api/projects/workspaces/ws-1/projects/project-1"
    );

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(deleteProject("ws-2", "project-2")).resolves.toEqual({ ok: true });
    expect(apiMock.delete).toHaveBeenLastCalledWith(
        "/api/projects/workspaces/ws-2/projects/project-2"
    );
});

test("deleteProject errors when workspace ID is missing", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: {} } });

    await expect(deleteProject("project-3")).rejects.toEqual({
        message: "Workspace ID required for project deletion",
        status: undefined,
    });
});

test("project service errors prefer response messages", async () => {
    const error = { response: { data: { message: "Project error" }, status: 500 } };

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getProjectsByWorkspace("ws-1")).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getProjectById("ws-1", "p1")).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(createProject("ws-1", { name: "Alpha" })).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(updateProject("ws-1", "p1", { name: "Beta" })).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(deleteProject("ws-1", "p1")).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getProjectTeams("ws-1", "p1")).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(addProjectTeams("ws-1", "p1", ["team-1"])).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(removeProjectTeams("ws-1", "p1", ["team-1"])).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getProjectMembers("ws-1", "p1")).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(addProjectMembers("ws-1", "p1", { members: ["u1"] })).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(removeProjectMembers("ws-1", "p1", { members: ["u1"] })).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(updateProjectMemberRole("ws-1", "p1", "u1", "admin")).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(leaveProject("ws-1", "p1")).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(requestProjectStatusChange("ws-1", "p1", { status: "hold" })).rejects.toEqual({
        message: "Project error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(
        respondProjectStatusChangeRequest("ws-1", "p1", "req-1", "approve")
    ).rejects.toEqual({
        message: "Project error",
        status: 500,
    });
});

test("project service errors fall back to defaults", async () => {
    apiMock.get.mockRejectedValueOnce({});
    await expect(getProjectsByWorkspace("ws-1")).rejects.toEqual({
        message: "Failed to fetch projects",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getProjectById("ws-1", "p1")).rejects.toEqual({
        message: "Failed to fetch project",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(createProject("ws-1", { name: "Alpha" })).rejects.toEqual({
        message: "Failed to create project",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(updateProject("ws-1", "p1", { name: "Beta" })).rejects.toEqual({
        message: "Failed to update project",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(deleteProject("ws-1", "p1")).rejects.toEqual({
        message: "Failed to delete project",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getProjectTeams("ws-1", "p1")).rejects.toEqual({
        message: "Failed to fetch project teams",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(addProjectTeams("ws-1", "p1", ["team-1"])).rejects.toEqual({
        message: "Failed to add teams to project",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(removeProjectTeams("ws-1", "p1", ["team-1"])).rejects.toEqual({
        message: "Failed to remove teams from project",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getProjectMembers("ws-1", "p1")).rejects.toEqual({
        message: "Failed to fetch project members",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(addProjectMembers("ws-1", "p1", { members: ["u1"] })).rejects.toEqual({
        message: "Failed to add members to project",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(removeProjectMembers("ws-1", "p1", { members: ["u1"] })).rejects.toEqual({
        message: "Failed to remove members from project",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(updateProjectMemberRole("ws-1", "p1", "u1", "admin")).rejects.toEqual({
        message: "Failed to update member role",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(leaveProject("ws-1", "p1")).rejects.toEqual({
        message: "Failed to leave project",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(requestProjectStatusChange("ws-1", "p1", { status: "hold" })).rejects.toEqual({
        message: "Failed to request project status change",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(
        respondProjectStatusChangeRequest("ws-1", "p1", "req-1", "approve")
    ).rejects.toEqual({
        message: "Failed to respond to project status request",
        status: undefined,
    });
});
