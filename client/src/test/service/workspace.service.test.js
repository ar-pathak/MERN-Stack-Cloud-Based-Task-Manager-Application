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
    acceptWorkspaceInvite,
    addWorkspaceMember,
    createWorkspace,
    deleteWorkspace,
    getAllWorkspaces,
    getQuickStatus,
    getWorkspaceById,
    getWorkspaceMembers,
    leaveWorkspace,
    removeMember,
    respondWorkspaceInvite,
    sendWorkspaceInvite,
    toggleArchiveWorkspace,
    toggleMuteWorkspace,
    toggleStarWorkspace,
    transferOwnership,
    updateMemberRole,
    updateWorkspace,
} from "../../service/workspace.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("workspace service returns payloads and defaults", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "w1" }] } });
    await expect(getAllWorkspaces()).resolves.toEqual([{ id: "w1" }]);

    apiMock.get.mockResolvedValueOnce({ data: [{ id: "w2" }] });
    await expect(getAllWorkspaces()).resolves.toEqual([{ id: "w2" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getAllWorkspaces()).resolves.toEqual([]);

    apiMock.get.mockResolvedValueOnce({ data: { data: { id: "w3" } } });
    await expect(getWorkspaceById("w3")).resolves.toEqual({ id: "w3" });

    apiMock.get.mockResolvedValueOnce({ data: { id: "w4" } });
    await expect(getWorkspaceById("w4")).resolves.toEqual({ id: "w4" });

    apiMock.get.mockResolvedValueOnce({});
    await expect(getWorkspaceById("w5")).resolves.toBeNull();

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "w6" } } });
    await expect(createWorkspace({ name: "Alpha" })).resolves.toEqual({ id: "w6" });

    apiMock.post.mockResolvedValueOnce({ data: { id: "w7" } });
    await expect(createWorkspace({ name: "Beta" })).resolves.toEqual({ id: "w7" });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(updateWorkspace("w1", { name: "Gamma" })).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { ok: false } });
    await expect(updateWorkspace("w1", { name: "Delta" })).resolves.toEqual({ ok: false });

    apiMock.delete.mockResolvedValueOnce({ data: { ok: true } });
    await expect(deleteWorkspace("w1")).resolves.toEqual({ ok: true });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "m1" }] } });
    await expect(getWorkspaceMembers("w1")).resolves.toEqual([{ id: "m1" }]);

    apiMock.get.mockResolvedValueOnce({ data: [{ id: "m2" }] });
    await expect(getWorkspaceMembers("w1")).resolves.toEqual([{ id: "m2" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getWorkspaceMembers("w1")).resolves.toEqual([]);

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(addWorkspaceMember({ workspaceId: "w1", username: "user1", role: "admin" })).resolves.toEqual({
        ok: true,
    });

    apiMock.post.mockResolvedValueOnce({ data: { ok: false } });
    await expect(addWorkspaceMember({ workspaceId: "w1", username: "user2", role: "member" })).resolves.toEqual({
        ok: false,
    });

    apiMock.delete.mockResolvedValueOnce({ data: { ok: true } });
    await expect(removeMember({ workspaceId: "w1", memberId: "m1" })).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(updateMemberRole({ workspaceId: "w1", memberId: "m2", role: "admin" })).resolves.toEqual({
        ok: true,
    });

    apiMock.patch.mockResolvedValueOnce({ data: { ok: false } });
    await expect(updateMemberRole({ workspaceId: "w1", memberId: "m2", role: "member" })).resolves.toEqual({
        ok: false,
    });

    const file = new File(["a,b"], "invite.csv", { type: "text/csv" });
    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(sendWorkspaceInvite({ workspaceId: "w1", email: "a@b.com", role: "member", file })).resolves.toEqual({
        ok: true,
    });
    const [fileUrl, formDataArg, configArg] = apiMock.post.mock.calls.at(-1);
    expect(fileUrl).toBe("/api/workspace/w1/invites");
    expect(formDataArg).toBeInstanceOf(FormData);
    expect(formDataArg.get("email")).toBe("a@b.com");
    expect(formDataArg.get("role")).toBe("member");
    expect(configArg?.headers?.["Content-Type"]).toBe("multipart/form-data");

    apiMock.post.mockResolvedValueOnce({ data: { ok: false } });
    await expect(sendWorkspaceInvite({ workspaceId: "w1", email: "b@c.com", role: "admin" })).resolves.toEqual({
        ok: false,
    });
    expect(apiMock.post).toHaveBeenLastCalledWith("/api/workspace/w1/invites", {
        email: "b@c.com",
        role: "admin",
    });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(acceptWorkspaceInvite("token-1")).resolves.toEqual({ ok: true });

    apiMock.post.mockResolvedValueOnce({ data: { ok: false } });
    await expect(acceptWorkspaceInvite("token-2")).resolves.toEqual({ ok: false });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(respondWorkspaceInvite({ inviteId: "inv-1", action: "accept" })).resolves.toEqual({
        ok: true,
    });

    apiMock.post.mockResolvedValueOnce({ data: { ok: false } });
    await expect(respondWorkspaceInvite({ inviteId: "inv-2", action: "reject" })).resolves.toEqual({
        ok: false,
    });

    apiMock.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(leaveWorkspace("w1")).resolves.toEqual({ ok: true });

    apiMock.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(transferOwnership({ workspaceId: "w1", newOwnerId: "u1" })).resolves.toEqual({ ok: true });

    apiMock.get.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(getQuickStatus("w1")).resolves.toEqual({ ok: true });

    apiMock.get.mockResolvedValueOnce({ data: { ok: false } });
    await expect(getQuickStatus("w1")).resolves.toEqual({ ok: false });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(toggleStarWorkspace("w1")).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { ok: false } });
    await expect(toggleStarWorkspace("w1")).resolves.toEqual({ ok: false });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(toggleMuteWorkspace("w1")).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { ok: false } });
    await expect(toggleMuteWorkspace("w1")).resolves.toEqual({ ok: false });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(toggleArchiveWorkspace("w1")).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { ok: false } });
    await expect(toggleArchiveWorkspace("w1")).resolves.toEqual({ ok: false });
});

test("workspace service errors prefer response messages", async () => {
    const error = { response: { data: { message: "Workspace error" }, status: 500 } };

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getAllWorkspaces()).rejects.toEqual({ message: "Workspace error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getWorkspaceById("w1")).rejects.toEqual({ message: "Workspace error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(createWorkspace({ name: "Alpha" })).rejects.toEqual({ message: "Workspace error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(updateWorkspace("w1", { name: "Beta" })).rejects.toEqual({ message: "Workspace error", status: 500 });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(deleteWorkspace("w1")).rejects.toEqual({ message: "Workspace error", status: 500 });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getWorkspaceMembers("w1")).rejects.toEqual({ message: "Workspace error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(addWorkspaceMember({ workspaceId: "w1", username: "user1", role: "admin" })).rejects.toEqual({
        message: "Workspace error",
        status: 500,
    });

    apiMock.delete.mockRejectedValueOnce(error);
    await expect(removeMember({ workspaceId: "w1", memberId: "m1" })).rejects.toEqual({
        message: "Workspace error",
        status: 500,
    });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(updateMemberRole({ workspaceId: "w1", memberId: "m1", role: "admin" })).rejects.toEqual({
        message: "Workspace error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(sendWorkspaceInvite({ workspaceId: "w1", email: "a@b.com" })).rejects.toEqual({
        message: "Workspace error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(acceptWorkspaceInvite("token-1")).rejects.toEqual({ message: "Workspace error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(respondWorkspaceInvite({ inviteId: "inv-1", action: "accept" })).rejects.toEqual({
        message: "Workspace error",
        status: 500,
    });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(leaveWorkspace("w1")).rejects.toEqual({ message: "Workspace error", status: 500 });

    apiMock.post.mockRejectedValueOnce(error);
    await expect(transferOwnership({ workspaceId: "w1", newOwnerId: "u1" })).rejects.toEqual({
        message: "Workspace error",
        status: 500,
    });

    apiMock.get.mockRejectedValueOnce(error);
    await expect(getQuickStatus("w1")).rejects.toEqual({ message: "Workspace error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(toggleStarWorkspace("w1")).rejects.toEqual({ message: "Workspace error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(toggleMuteWorkspace("w1")).rejects.toEqual({ message: "Workspace error", status: 500 });

    apiMock.patch.mockRejectedValueOnce(error);
    await expect(toggleArchiveWorkspace("w1")).rejects.toEqual({ message: "Workspace error", status: 500 });
});

test("workspace service errors fall back to defaults", async () => {
    apiMock.get.mockRejectedValueOnce({});
    await expect(getAllWorkspaces()).rejects.toEqual({
        message: "Failed to fetch workspaces",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getWorkspaceById("w1")).rejects.toEqual({
        message: "Failed to fetch workspace",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(createWorkspace({ name: "Alpha" })).rejects.toEqual({
        message: "Failed to create workspace",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(updateWorkspace("w1", { name: "Beta" })).rejects.toEqual({
        message: "Failed to update workspace",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(deleteWorkspace("w1")).rejects.toEqual({
        message: "Failed to delete workspace",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getWorkspaceMembers("w1")).rejects.toEqual({
        message: "Failed to fetch members",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(addWorkspaceMember({ workspaceId: "w1", username: "user1", role: "admin" })).rejects.toEqual({
        message: "Failed to add member",
        status: undefined,
    });

    apiMock.delete.mockRejectedValueOnce({});
    await expect(removeMember({ workspaceId: "w1", memberId: "m1" })).rejects.toEqual({
        message: "Failed to remove member",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(updateMemberRole({ workspaceId: "w1", memberId: "m1", role: "admin" })).rejects.toEqual({
        message: "Failed to update member role",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(sendWorkspaceInvite({ workspaceId: "w1", email: "a@b.com" })).rejects.toEqual({
        message: "Failed to send invite",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(acceptWorkspaceInvite("token-1")).rejects.toEqual({
        message: "Failed to accept invite",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(respondWorkspaceInvite({ inviteId: "inv-1", action: "accept" })).rejects.toEqual({
        message: "Failed to process invite action",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(leaveWorkspace("w1")).rejects.toEqual({
        message: "Failed to leave workspace",
        status: undefined,
    });

    apiMock.post.mockRejectedValueOnce({});
    await expect(transferOwnership({ workspaceId: "w1", newOwnerId: "u1" })).rejects.toEqual({
        message: "Failed to transfer ownership",
        status: undefined,
    });

    apiMock.get.mockRejectedValueOnce({});
    await expect(getQuickStatus("w1")).rejects.toEqual({
        message: "Failed to fetch quick status",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(toggleStarWorkspace("w1")).rejects.toEqual({
        message: "Failed to toggle star",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(toggleMuteWorkspace("w1")).rejects.toEqual({
        message: "Failed to toggle mute",
        status: undefined,
    });

    apiMock.patch.mockRejectedValueOnce({});
    await expect(toggleArchiveWorkspace("w1")).rejects.toEqual({
        message: "Failed to toggle archive",
        status: undefined,
    });
});
