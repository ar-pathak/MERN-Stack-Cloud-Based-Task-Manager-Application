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
    addTeamMember,
    createTeam,
    deleteTeam,
    getTeamById,
    getTeamMembers,
    getTeamsByWorkspace,
    leaveTeamService,
    removeTeamMember,
    updateTeam,
    updateTeamMemberRole,
} from "../../service/team.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("team service returns payloads and defaults", async () => {
    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "team-1" } } });
    await expect(createTeam("ws-1", { name: "Alpha" })).resolves.toEqual({ id: "team-1" });
    expect(apiMock.post).toHaveBeenLastCalledWith(
        "/api/teams/workspaces/ws-1/teams",
        { name: "Alpha" }
    );

    apiMock.post.mockResolvedValueOnce({ data: { id: "team-2" } });
    await expect(createTeam("ws-1", { name: "Beta" })).resolves.toEqual({ id: "team-2" });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "team-1" }] } });
    await expect(getTeamsByWorkspace("ws-1")).resolves.toEqual([{ id: "team-1" }]);

    apiMock.get.mockResolvedValueOnce({ data: [{ id: "team-2" }] });
    await expect(getTeamsByWorkspace("ws-1")).resolves.toEqual([{ id: "team-2" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getTeamsByWorkspace("ws-1")).resolves.toEqual([]);

    apiMock.get.mockResolvedValueOnce({ data: { data: { id: "team-3" } } });
    await expect(getTeamById("ws-1", "team-3")).resolves.toEqual({ id: "team-3" });

    apiMock.get.mockResolvedValueOnce({ data: { id: "team-4" } });
    await expect(getTeamById("ws-1", "team-4")).resolves.toEqual({ id: "team-4" });

    apiMock.patch.mockResolvedValueOnce({ data: { ok: true } });
    await expect(updateTeam("ws-1", "team-3", { name: "Gamma" })).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { ok: true } });
    await expect(deleteTeam("ws-1", "team-3")).resolves.toEqual({ ok: true });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "m1" }] } });
    await expect(getTeamMembers("ws-1", "team-3")).resolves.toEqual([{ id: "m1" }]);

    apiMock.get.mockResolvedValueOnce({ data: [{ id: "m2" }] });
    await expect(getTeamMembers("ws-1", "team-3")).resolves.toEqual([{ id: "m2" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getTeamMembers("ws-1", "team-3")).resolves.toEqual([]);

    apiMock.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(addTeamMember("ws-1", "team-3", { memberId: "u1" })).resolves.toEqual({
        ok: true,
    });

    apiMock.delete.mockResolvedValueOnce({ data: { ok: true } });
    await expect(removeTeamMember("ws-1", "team-3", "u1")).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { ok: true } });
    await expect(updateTeamMemberRole("ws-1", "team-3", "u1", "admin")).resolves.toEqual({
        ok: true,
    });

    apiMock.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(leaveTeamService("ws-1", "team-3")).resolves.toEqual({ ok: true });
});

test("team service errors prefer response messages", async () => {
    const error = {
        response: { data: { message: "Team error" }, status: 500 },
    };

    apiMock.post.mockRejectedValueOnce(error);
    await expect(createTeam("ws-1", { name: "Alpha" })).rejects.toEqual({
        message: "Team error",
        status: 500,
    });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getTeamsByWorkspace("ws-1")).rejects.toEqual({
        message: "Team error",
        status: 500,
    });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getTeamById("ws-1", "team-1")).rejects.toEqual({
        message: "Team error",
        status: 500,
    });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(updateTeam("ws-1", "team-1", { name: "Beta" })).rejects.toEqual({
        message: "Team error",
        status: 500,
    });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(deleteTeam("ws-1", "team-1")).rejects.toEqual({
        message: "Team error",
        status: 500,
    });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getTeamMembers("ws-1", "team-1")).rejects.toEqual({
        message: "Team error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(addTeamMember("ws-1", "team-1", { memberId: "u1" })).rejects.toEqual({
        message: "Team error",
        status: 500,
    });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(removeTeamMember("ws-1", "team-1", "u1")).rejects.toEqual({
        message: "Team error",
        status: 500,
    });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(updateTeamMemberRole("ws-1", "team-1", "u1", "admin")).rejects.toEqual({
        message: "Team error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(leaveTeamService("ws-1", "team-1")).rejects.toEqual({
        message: "Team error",
        status: 500,
    });
});

test("team service errors fall back to default messages", async () => {
    apiMock.post.mockRejectedValueOnce({});
    await expect(createTeam("ws-1", { name: "Alpha" })).rejects.toEqual({
        message: "Failed to create team",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getTeamsByWorkspace("ws-1")).rejects.toEqual({
        message: "Failed to fetch teams",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getTeamById("ws-1", "team-1")).rejects.toEqual({
        message: "Failed to fetch team",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(updateTeam("ws-1", "team-1", { name: "Beta" })).rejects.toEqual({
        message: "Failed to update team",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(deleteTeam("ws-1", "team-1")).rejects.toEqual({
        message: "Failed to delete team",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getTeamMembers("ws-1", "team-1")).rejects.toEqual({
        message: "Failed to fetch team members",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(addTeamMember("ws-1", "team-1", { memberId: "u1" })).rejects.toEqual({
        message: "Failed to add team member",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(removeTeamMember("ws-1", "team-1", "u1")).rejects.toEqual({
        message: "Failed to remove team member",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(updateTeamMemberRole("ws-1", "team-1", "u1", "admin")).rejects.toEqual({
        message: "Failed to update member role",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(leaveTeamService("ws-1", "team-1")).rejects.toEqual({
        message: "Failed to leave team",
        status: undefined,
    });
});
