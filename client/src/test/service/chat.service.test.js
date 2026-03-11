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
    addMembersToGroup,
    addReaction,
    checkPrivateChatExists,
    createGroupChat,
    deleteMessage,
    editMessage,
    getConversations,
    getMessages,
    getUnreadCallInviteSummary,
    getUnreadMentionSummary,
    initiateChat,
    leaveGroup,
    removeMemberFromGroup,
    removeReaction,
    searchMessages,
    sendMessage,
    toggleChatArchive,
    toggleChatMute,
    togglePinMessage,
    updateGroupChat,
    uploadFile,
} from "../../service/chat.service.js";

beforeEach(() => {
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("chat service returns payloads and defaults", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "c1" }] } });
    await expect(getConversations()).resolves.toEqual([{ id: "c1" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getConversations()).resolves.toEqual([]);

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "chat-1" } } });
    await expect(initiateChat("user-1")).resolves.toEqual({ id: "chat-1" });
    expect(apiMock.post).toHaveBeenCalledWith("/api/chat/private", { userId: "user-1" });

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "chat-2" } } });
    await expect(createGroupChat("Team", ["u1"])).resolves.toEqual({ id: "chat-2" });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(updateGroupChat("chat-2", { name: "Team 2" })).resolves.toEqual({ ok: true });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(addMembersToGroup("chat-2", ["u2"])).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(removeMemberFromGroup("chat-2", "u2")).resolves.toEqual({ ok: true });
    expect(apiMock.delete).toHaveBeenCalledWith("/api/chat/chat-2/members", { data: { userId: "u2" } });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(leaveGroup("chat-2")).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(toggleChatMute("chat-2")).resolves.toEqual({ ok: true });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(toggleChatArchive("chat-2")).resolves.toEqual({ ok: true });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "m1" }] } });
    await expect(getMessages("chat-2")).resolves.toEqual([{ id: "m1" }]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getMessages("chat-2")).resolves.toEqual([]);

    apiMock.get.mockResolvedValueOnce({});
    await expect(getUnreadMentionSummary()).resolves.toEqual({
        mentions: [],
        byChat: {},
        totalUnreadMentions: 0,
    });

    apiMock.get.mockResolvedValueOnce({});
    await expect(getUnreadCallInviteSummary()).resolves.toEqual({
        invites: [],
        byChat: {},
        totalUnreadInvites: 0,
    });

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "msg-1" } } });
    await expect(sendMessage("chat-1", "Hello")).resolves.toEqual({ id: "msg-1" });
    expect(apiMock.post).toHaveBeenLastCalledWith("/api/chat/message", {
        chatId: "chat-1",
        content: "Hello",
    });

    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "msg-2" } } });
    await expect(
        sendMessage("chat-2", "Hi", [{ id: "file-1" }], "msg-1", "post-1")
    ).resolves.toEqual({ id: "msg-2" });
    expect(apiMock.post).toHaveBeenLastCalledWith("/api/chat/message", {
        chatId: "chat-2",
        content: "Hi",
        attachments: [{ id: "file-1" }],
        replyTo: "msg-1",
        postId: "post-1",
    });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(editMessage("msg-2", "chat-2", "Edited")).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(deleteMessage("msg-2", "chat-2")).resolves.toEqual({ ok: true });
    expect(apiMock.delete).toHaveBeenCalledWith("/api/chat/message/msg-2", { data: { chatId: "chat-2" } });

    apiMock.patch.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(togglePinMessage("msg-2", "chat-2")).resolves.toEqual({ ok: true });

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: "m2" }] } });
    await expect(searchMessages("chat-2", "hey", 5)).resolves.toEqual([{ id: "m2" }]);
    expect(apiMock.get).toHaveBeenCalledWith("/api/chat/chat-2/messages/search", {
        params: { q: "hey", limit: 5 },
    });

    apiMock.post.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(addReaction("msg-2", "chat-2", "🔥")).resolves.toEqual({ ok: true });

    apiMock.delete.mockResolvedValueOnce({ data: { data: { ok: true } } });
    await expect(removeReaction("msg-2", "chat-2", "🔥")).resolves.toEqual({ ok: true });
    expect(apiMock.delete).toHaveBeenCalledWith("/api/chat/message/msg-2/reaction", {
        data: { chatId: "chat-2", emoji: "🔥" },
    });

    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const onProgress = vi.fn();
    apiMock.post.mockResolvedValueOnce({ data: { data: { url: "file-url" } } });
    const uploadPromise = uploadFile(file, onProgress);
    const [uploadUrl, formDataArg, configArg] = apiMock.post.mock.calls.at(-1);
    expect(uploadUrl).toBe("/api/chat/upload");
    expect(formDataArg).toBeInstanceOf(FormData);
    expect(formDataArg.get("file")).toBe(file);
    expect(configArg?.headers?.["Content-Type"]).toBe("multipart/form-data");
    configArg.onUploadProgress({ loaded: 5, total: 10 });
    expect(onProgress).toHaveBeenCalledWith(50);
    await expect(uploadPromise).resolves.toEqual({ url: "file-url" });

    apiMock.get.mockResolvedValueOnce({ data: { data: { exists: true } } });
    await expect(checkPrivateChatExists("user-2")).resolves.toEqual({ exists: true });
});

test("chat service errors prefer response messages", async () => {
    const error = { response: { data: { message: "Chat error" }, status: 500 } };

    const getCalls = [
        () => getConversations(),
        () => getMessages("chat-1"),
        () => getUnreadMentionSummary(),
        () => getUnreadCallInviteSummary(),
        () => searchMessages("chat-1", "hello"),
        () => checkPrivateChatExists("user-1"),
    ];
    getCalls.forEach(() => apiMock.get.mockRejectedValueOnce(error));
    for (const call of getCalls) {
        await expect(call()).rejects.toEqual({ message: "Chat error", status: 500 });
    }

    const postCalls = [
        () => initiateChat("user-1"),
        () => createGroupChat("Team", ["user-2"]),
        () => addMembersToGroup("chat-1", ["user-3"]),
        () => leaveGroup("chat-1"),
        () => sendMessage("chat-1", "Hello"),
        () => addReaction("msg-1", "chat-1", "🔥"),
        () => uploadFile(new File(["a"], "a.txt")),
    ];
    postCalls.forEach(() => apiMock.post.mockRejectedValueOnce(error));
    for (const call of postCalls) {
        await expect(call()).rejects.toEqual({ message: "Chat error", status: 500 });
    }

    const patchCalls = [
        () => updateGroupChat("chat-1", { name: "Updated" }),
        () => toggleChatMute("chat-1"),
        () => toggleChatArchive("chat-1"),
        () => editMessage("msg-1", "chat-1", "Edited"),
        () => togglePinMessage("msg-1", "chat-1"),
    ];
    patchCalls.forEach(() => apiMock.patch.mockRejectedValueOnce(error));
    for (const call of patchCalls) {
        await expect(call()).rejects.toEqual({ message: "Chat error", status: 500 });
    }

    const deleteCalls = [
        () => removeMemberFromGroup("chat-1", "user-2"),
        () => deleteMessage("msg-1", "chat-1"),
        () => removeReaction("msg-1", "chat-1", "🔥"),
    ];
    deleteCalls.forEach(() => apiMock.delete.mockRejectedValueOnce(error));
    for (const call of deleteCalls) {
        await expect(call()).rejects.toEqual({ message: "Chat error", status: 500 });
    }
});

test("chat service errors fall back to defaults", async () => {
    const getCases = [
        { fn: () => getConversations(), message: "Failed to fetch conversations" },
        { fn: () => getMessages("chat-1"), message: "Failed to fetch messages" },
        { fn: () => getUnreadMentionSummary(), message: "Failed to fetch unread mention summary" },
        { fn: () => getUnreadCallInviteSummary(), message: "Failed to fetch unread call invite summary" },
        { fn: () => searchMessages("chat-1", "hello"), message: "Failed to search messages" },
        { fn: () => checkPrivateChatExists("user-1"), message: "Failed to check chat existence" },
    ];
    getCases.forEach(() => apiMock.get.mockRejectedValueOnce({}));
    for (const { fn, message } of getCases) {
        await expect(fn()).rejects.toEqual({ message, status: undefined });
    }

    const postCases = [
        { fn: () => initiateChat("user-1"), message: "Failed to start chat" },
        { fn: () => createGroupChat("Team", ["user-2"]), message: "Failed to create group chat" },
        { fn: () => addMembersToGroup("chat-1", ["user-3"]), message: "Failed to add members" },
        { fn: () => leaveGroup("chat-1"), message: "Failed to leave group" },
        { fn: () => sendMessage("chat-1", "Hello"), message: "Failed to send message" },
        { fn: () => addReaction("msg-1", "chat-1", "🔥"), message: "Failed to add reaction" },
        { fn: () => uploadFile(new File(["a"], "a.txt")), message: "Failed to upload file" },
    ];
    postCases.forEach(() => apiMock.post.mockRejectedValueOnce({}));
    for (const { fn, message } of postCases) {
        await expect(fn()).rejects.toEqual({ message, status: undefined });
    }

    const patchCases = [
        { fn: () => updateGroupChat("chat-1", { name: "Updated" }), message: "Failed to update group" },
        { fn: () => toggleChatMute("chat-1"), message: "Failed to toggle chat mute" },
        { fn: () => toggleChatArchive("chat-1"), message: "Failed to toggle chat archive" },
        { fn: () => editMessage("msg-1", "chat-1", "Edited"), message: "Failed to edit message" },
        { fn: () => togglePinMessage("msg-1", "chat-1"), message: "Failed to pin message" },
    ];
    patchCases.forEach(() => apiMock.patch.mockRejectedValueOnce({}));
    for (const { fn, message } of patchCases) {
        await expect(fn()).rejects.toEqual({ message, status: undefined });
    }

    const deleteCases = [
        { fn: () => removeMemberFromGroup("chat-1", "user-2"), message: "Failed to remove member" },
        { fn: () => deleteMessage("msg-1", "chat-1"), message: "Failed to delete message" },
        { fn: () => removeReaction("msg-1", "chat-1", "🔥"), message: "Failed to remove reaction" },
    ];
    deleteCases.forEach(() => apiMock.delete.mockRejectedValueOnce({}));
    for (const { fn, message } of deleteCases) {
        await expect(fn()).rejects.toEqual({ message, status: undefined });
    }
});
