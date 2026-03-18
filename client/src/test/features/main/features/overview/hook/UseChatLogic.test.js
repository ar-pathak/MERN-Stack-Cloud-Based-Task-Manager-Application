import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const {
    useAuthMock,
    getMessagesMock,
    sendMessageMock,
    deleteMessageMock,
    togglePinMessageMock,
    editMessageMock,
    addReactionMock,
    removeReactionMock,
    getSocketMock,
    connectSocketMock,
    onReceiveMessageMock,
    onMessageReadMock,
    onTypingMock,
    onStopTypingMock,
    onMessageDeletedMock,
    onMessageEditedMock,
    onReactionUpdatedMock,
    onMessagePinUpdatedMock,
    emitMessageReadMock,
    emitStopTypingMock,
    emitSendMessageMock,
    emitTypingMock,
    uploadFileMock
} = vi.hoisted(() => ({
    useAuthMock: vi.fn(),
    getMessagesMock: vi.fn(),
    sendMessageMock: vi.fn(),
    deleteMessageMock: vi.fn(),
    togglePinMessageMock: vi.fn(),
    editMessageMock: vi.fn(),
    addReactionMock: vi.fn(),
    removeReactionMock: vi.fn(),
    getSocketMock: vi.fn(),
    connectSocketMock: vi.fn(),
    onReceiveMessageMock: vi.fn(),
    onMessageReadMock: vi.fn(),
    onTypingMock: vi.fn(),
    onStopTypingMock: vi.fn(),
    onMessageDeletedMock: vi.fn(),
    onMessageEditedMock: vi.fn(),
    onReactionUpdatedMock: vi.fn(),
    onMessagePinUpdatedMock: vi.fn(),
    emitMessageReadMock: vi.fn(),
    emitStopTypingMock: vi.fn(),
    emitSendMessageMock: vi.fn(),
    emitTypingMock: vi.fn(),
    uploadFileMock: vi.fn()
}));

vi.mock("../../../../../../context/AuthContext", () => ({
    useAuth: useAuthMock
}));

vi.mock("../../../../../../service/chat.service", () => ({
    getMessages: getMessagesMock,
    sendMessage: sendMessageMock,
    deleteMessage: deleteMessageMock,
    togglePinMessage: togglePinMessageMock,
    editMessage: editMessageMock,
    addReaction: addReactionMock,
    removeReaction: removeReactionMock
}));

vi.mock("../../../../../../service/Chat.socket.service", () => ({
    getSocket: getSocketMock,
    connectSocket: connectSocketMock,
    onReceiveMessage: onReceiveMessageMock,
    onMessageRead: onMessageReadMock,
    onTyping: onTypingMock,
    onStopTyping: onStopTypingMock,
    onMessageDeleted: onMessageDeletedMock,
    onMessageEdited: onMessageEditedMock,
    onReactionUpdated: onReactionUpdatedMock,
    onMessagePinUpdated: onMessagePinUpdatedMock,
    emitMessageRead: emitMessageReadMock,
    emitStopTyping: emitStopTypingMock,
    emitSendMessage: emitSendMessageMock,
    emitTyping: emitTypingMock
}));

vi.mock("../../../../../../service/upload.service", () => ({
    uploadService: {
        uploadFile: uploadFileMock
    }
}));

import { useChatLogic } from "../../../../../../features/main/features/overview/hook/useChatLogic.js";

const baseUser = {
    _id: "user-1",
    id: "user-1",
    name: "Riya",
    avatar: "avatar.png"
};

const makeSelectedChat = (overrides = {}) => ({
    chatId: "chat-1",
    permissions: { role: "member" },
    ...overrides
});

const makeHistory = () => ([
    {
        _id: "m-2",
        content: "Later message",
        createdAt: "2026-03-18T10:05:00.000Z",
        senderId: { _id: "user-2", name: "Alex" },
        reactions: []
    },
    {
        _id: "m-1",
        content: "Earlier message",
        createdAt: "2026-03-18T10:00:00.000Z",
        senderId: { _id: "user-1", name: "Riya" },
        reactions: []
    }
]);

const renderChatHook = (selectedChat = makeSelectedChat()) =>
    renderHook(({ chat }) => useChatLogic(chat), {
        initialProps: { chat: selectedChat }
    });

let listeners = {};
let unsubscribers = {};

const registerSocketListener = (mock, name) => {
    mock.mockImplementation((callback) => {
        listeners[name] = callback;
        const unsubscribe = vi.fn();
        unsubscribers[name] = unsubscribe;
        return unsubscribe;
    });
};

beforeEach(() => {
    vi.clearAllMocks();
    listeners = {};
    unsubscribers = {};

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    useAuthMock.mockReturnValue({ user: baseUser });
    getSocketMock.mockReturnValue({ id: "socket-1" });
    connectSocketMock.mockReturnValue({ id: "socket-1" });

    registerSocketListener(onReceiveMessageMock, "receive");
    registerSocketListener(onMessageReadMock, "read");
    registerSocketListener(onTypingMock, "typing");
    registerSocketListener(onStopTypingMock, "stopTyping");
    registerSocketListener(onMessageDeletedMock, "deleted");
    registerSocketListener(onMessageEditedMock, "edited");
    registerSocketListener(onReactionUpdatedMock, "reaction");
    registerSocketListener(onMessagePinUpdatedMock, "pin");

    getMessagesMock.mockResolvedValue({ messages: makeHistory() });
    sendMessageMock.mockResolvedValue({
        _id: "server-1",
        content: "Hello there",
        createdAt: "2026-03-18T10:10:00.000Z",
        senderId: { _id: "user-1" },
        reactions: []
    });
    deleteMessageMock.mockResolvedValue({ success: true });
    togglePinMessageMock.mockResolvedValue({
        messageId: "m-1",
        pinned: true,
        pinnedAt: "2026-03-18T10:06:00.000Z",
        pinnedBy: { _id: "user-2" }
    });
    editMessageMock.mockResolvedValue({ success: true });
    addReactionMock.mockResolvedValue({ success: true });
    removeReactionMock.mockResolvedValue({ success: true });
    uploadFileMock.mockResolvedValue({
        url: "https://cdn.example.com/uploaded.png",
        type: "image/png",
        name: "uploaded.png",
        size: 128
    });

    Object.defineProperty(URL, "createObjectURL", {
        value: vi.fn(() => "blob:preview-file"),
        configurable: true
    });

    globalThis.alert = vi.fn();
});

test("initializes socket, loads sorted history, and marks the latest inbound message as read", async () => {
    getSocketMock.mockReturnValueOnce(null);

    const { result } = renderChatHook();

    await waitFor(() => {
        expect(connectSocketMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
        expect(getMessagesMock).toHaveBeenCalledWith("chat-1", { page: 1, limit: 50 });
    });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages.map((message) => message._id)).toEqual(["m-1", "m-2"]);
    expect(result.current.messages[0].isOwn).toBe(true);
    expect(result.current.messages[1].isOwn).toBe(false);
    expect(emitMessageReadMock).toHaveBeenCalledWith("chat-1", "m-2");
    expect(result.current.canSendMessages).toBe(true);
});

test("processes socket listeners and cleans up subscriptions on unmount", async () => {
    const { result, unmount } = renderChatHook();

    await waitFor(() => {
        expect(onReceiveMessageMock).toHaveBeenCalledTimes(1);
    });

    const scrollSpy = vi.fn();
    act(() => {
        result.current.refs.chatEndRef.current = { scrollIntoView: scrollSpy };
    });

    await act(async () => {
        listeners.receive({
            chatId: "chat-1",
            message: {
                _id: "m-3",
                content: "Incoming message",
                createdAt: "2026-03-18T10:08:00.000Z",
                senderId: { _id: "user-2" },
                reactions: []
            }
        });
    });

    await waitFor(() => {
        expect(result.current.messages.some((message) => message._id === "m-3")).toBe(true);
    });
    expect(emitMessageReadMock).toHaveBeenCalledWith("chat-1", "m-3");

    await act(async () => {
        listeners.receive({
            chatId: "chat-1",
            message: {
                _id: "m-3",
                content: "Incoming message",
                createdAt: "2026-03-18T10:08:00.000Z",
                senderId: { _id: "user-2" }
            }
        });
    });
    expect(result.current.messages.filter((message) => message._id === "m-3")).toHaveLength(1);

    await act(async () => {
        listeners.read({
            chatId: "chat-1",
            lastReadMessageId: "m-3",
            userId: "reader-9",
            lastReadAt: "2026-03-18T10:08:01.000Z"
        });
    });

    const readUpdated = result.current.messages.find((message) => message._id === "m-3");
    expect(readUpdated.isRead).toBe(true);
    expect(readUpdated.readBy.some((entry) => String(entry.userId) === "reader-9")).toBe(true);

    await act(async () => {
        listeners.typing({
            chatId: "chat-1",
            userId: "user-55",
            userName: "Typing User"
        });
    });
    expect(result.current.isTyping).toBe(true);
    expect(result.current.typingUsers).toEqual([{ userId: "user-55", userName: "Typing User" }]);

    await act(async () => {
        listeners.stopTyping({
            chatId: "chat-1",
            userId: "user-55"
        });
    });
    expect(result.current.isTyping).toBe(false);
    expect(result.current.typingUsers).toEqual([]);

    await act(async () => {
        listeners.edited({
            chatId: "chat-1",
            messageId: "m-3",
            content: "Edited text"
        });
    });
    expect(result.current.messages.find((message) => message._id === "m-3")?.content).toBe("Edited text");

    await act(async () => {
        listeners.reaction({
            chatId: "chat-1",
            messageId: "m-3",
            reactions: [{ emoji: "fire", userId: "user-2" }]
        });
    });
    expect(result.current.messages.find((message) => message._id === "m-3")?.reactions).toEqual([
        { emoji: "fire", userId: "user-2" }
    ]);

    await act(async () => {
        listeners.pin({
            chatId: "chat-1",
            messageId: "m-3",
            pinned: true,
            pinnedAt: "2026-03-18T10:09:00.000Z",
            pinnedBy: { _id: "user-2" }
        });
    });
    expect(result.current.messages.find((message) => message._id === "m-3")?.pinned).toBe(true);

    await act(async () => {
        listeners.deleted({
            chatId: "chat-1",
            messageId: "m-3"
        });
    });
    expect(result.current.messages.some((message) => message._id === "m-3")).toBe(false);

    unmount();
    expect(unsubscribers.receive).toHaveBeenCalledTimes(1);
    expect(unsubscribers.read).toHaveBeenCalledTimes(1);
    expect(unsubscribers.typing).toHaveBeenCalledTimes(1);
    expect(unsubscribers.stopTyping).toHaveBeenCalledTimes(1);
    expect(unsubscribers.deleted).toHaveBeenCalledTimes(1);
    expect(unsubscribers.edited).toHaveBeenCalledTimes(1);
    expect(unsubscribers.reaction).toHaveBeenCalledTimes(1);
    expect(unsubscribers.pin).toHaveBeenCalledTimes(1);
});

test("sends message with optimistic UI, file upload, and socket emit", async () => {
    getMessagesMock.mockResolvedValueOnce([]);
    const uploadedFile = {
        url: "https://cdn.example.com/photo.png",
        type: "image/png",
        name: "photo.png",
        size: 256
    };
    uploadFileMock.mockResolvedValueOnce(uploadedFile);
    sendMessageMock.mockResolvedValueOnce({
        _id: "server-2",
        content: "Hello there",
        createdAt: "2026-03-18T10:12:00.000Z",
        senderId: { _id: "user-1" },
        reactions: []
    });

    const { result } = renderChatHook();

    await waitFor(() => {
        expect(getMessagesMock).toHaveBeenCalled();
    });

    act(() => {
        result.current.setShowEmojiPicker(true);
        result.current.setChatMessage("  Hello there  ");
    });

    const file = new File(["photo-bytes"], "photo.png", { type: "image/png" });
    await act(async () => {
        await result.current.handleSendMessage({
            file,
            attachments: [{ url: "https://seed.example.com/seed.png", type: "image/png" }],
            replyTo: { _id: "m-1" }
        });
    });

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(uploadFileMock).toHaveBeenCalledWith(file);
    expect(sendMessageMock).toHaveBeenCalledWith(
        "chat-1",
        "Hello there",
        [
            { url: "https://seed.example.com/seed.png", type: "image/png" },
            uploadedFile
        ],
        "m-1"
    );
    expect(emitStopTypingMock).toHaveBeenCalledWith("chat-1");
    expect(emitSendMessageMock).toHaveBeenCalledWith("chat-1", expect.objectContaining({ _id: "server-2" }));
    expect(result.current.chatMessage).toBe("");
    expect(result.current.showEmojiPicker).toBe(false);
    expect(result.current.uploadingFile).toBe(false);
    expect(result.current.messages.some((message) => message._id === "server-2")).toBe(true);
});

test("maps send permission and membership failures to user-friendly errors", async () => {
    getMessagesMock.mockResolvedValueOnce([]);
    sendMessageMock.mockRejectedValueOnce({
        status: 403,
        message: "No permission to send in this chat"
    });

    const { result, rerender } = renderChatHook(makeSelectedChat({ chatId: "chat-1" }));

    await waitFor(() => {
        expect(getMessagesMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
        result.current.setChatMessage("blocked message");
    });

    await act(async () => {
        await result.current.handleSendMessage();
    });

    expect(result.current.sendPermissionError).toBe("Aapke pass message bhejne ki permission nahi hai.");
    expect(result.current.messages).toHaveLength(0);

    getMessagesMock.mockResolvedValueOnce([]);
    sendMessageMock.mockRejectedValueOnce({
        status: 403,
        message: "User is not a member"
    });

    await act(async () => {
        rerender({ chat: makeSelectedChat({ chatId: "chat-2" }) });
    });

    await waitFor(() => {
        expect(getMessagesMock).toHaveBeenCalledTimes(2);
    });

    act(() => {
        result.current.setChatMessage("membership blocked");
    });

    await act(async () => {
        await result.current.handleSendMessage();
    });

    expect(result.current.chatAccessError).toBe("You are not a member of this section chat.");
    expect(result.current.messages).toHaveLength(0);
});

test("marks optimistic message as failed and alerts on generic send failure", async () => {
    getMessagesMock.mockResolvedValueOnce([]);
    sendMessageMock.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderChatHook();

    await waitFor(() => {
        expect(getMessagesMock).toHaveBeenCalled();
    });

    act(() => {
        result.current.setChatMessage("retry me");
    });

    await act(async () => {
        await result.current.handleSendMessage();
    });

    expect(globalThis.alert).toHaveBeenCalledWith("Failed to send message: network down");
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].status).toBe("failed");
});

test("handleFileUpload uploads and sends attachment, and enforces viewer restrictions", async () => {
    getMessagesMock.mockResolvedValueOnce([]);
    const uploadedAttachment = {
        url: "https://cdn.example.com/report.pdf",
        type: "application/pdf",
        name: "report.pdf",
        size: 98
    };
    uploadFileMock.mockResolvedValueOnce(uploadedAttachment);
    sendMessageMock.mockResolvedValueOnce({
        _id: "server-file",
        content: "",
        createdAt: "2026-03-18T10:14:00.000Z",
        senderId: { _id: "user-1" },
        attachments: [uploadedAttachment]
    });

    const { result } = renderChatHook();

    await waitFor(() => {
        expect(getMessagesMock).toHaveBeenCalled();
    });

    act(() => {
        result.current.refs.fileInputRef.current = { value: "pending-file" };
    });

    const file = new File(["pdf"], "report.pdf", { type: "application/pdf" });
    await act(async () => {
        await result.current.handleFileUpload({
            target: {
                files: [file]
            }
        });
    });

    expect(uploadFileMock).toHaveBeenCalledWith(file);
    expect(sendMessageMock).toHaveBeenCalledWith("chat-1", "", [uploadedAttachment], undefined);
    expect(result.current.refs.fileInputRef.current.value).toBe("");
    expect(result.current.uploadingFile).toBe(false);

    const { result: viewerResult } = renderChatHook(
        makeSelectedChat({
            chatId: "chat-viewer",
            permissions: { role: "viewer" }
        })
    );

    await waitFor(() => {
        expect(getMessagesMock).toHaveBeenCalledTimes(2);
    });

    act(() => {
        viewerResult.current.refs.fileInputRef.current = { value: "viewer-file" };
    });

    await act(async () => {
        await viewerResult.current.handleFileUpload({
            target: {
                files: [new File(["x"], "blocked.txt", { type: "text/plain" })]
            }
        });
    });

    expect(viewerResult.current.sendPermissionError).toBe("Aapke pass message bhejne ki permission nahi hai.");
    expect(viewerResult.current.refs.fileInputRef.current.value).toBe("");
});

test("supports edit, delete, pin, and reaction handlers", async () => {
    const { result } = renderChatHook();

    await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
    });

    await act(async () => {
        await result.current.handleEditMessage("m-1", "Updated text");
    });

    expect(editMessageMock).toHaveBeenCalledWith("m-1", "chat-1", "Updated text");
    expect(result.current.messages.find((message) => message._id === "m-1")?.content).toBe("Updated text");
    expect(result.current.messages.find((message) => message._id === "m-1")?.edited).toBe(true);

    await act(async () => {
        await result.current.handlePinMessage("m-1");
    });

    expect(togglePinMessageMock).toHaveBeenCalledWith("m-1", "chat-1");
    expect(result.current.messages.find((message) => message._id === "m-1")?.pinned).toBe(true);

    await act(async () => {
        await result.current.handleReaction("m-1", "smile");
    });

    expect(addReactionMock).toHaveBeenCalledWith("m-1", "chat-1", "smile");
    expect(result.current.messages.find((message) => message._id === "m-1")?.reactions).toEqual([
        { emoji: "smile", userId: "user-1" }
    ]);

    await act(async () => {
        await result.current.handleReaction("m-1", "smile");
    });

    expect(removeReactionMock).toHaveBeenCalledWith("m-1", "chat-1", "smile");
    expect(result.current.messages.find((message) => message._id === "m-1")?.reactions).toEqual([]);

    await act(async () => {
        await result.current.handleDeleteMessage("m-2");
    });

    expect(deleteMessageMock).toHaveBeenCalledWith("m-2", "chat-1");
    expect(result.current.messages.some((message) => message._id === "m-2")).toBe(false);
});

test("maps history-load access errors and updates canSendMessages", async () => {
    getMessagesMock
        .mockRejectedValueOnce({ status: 403, message: "not a member" })
        .mockRejectedValueOnce({ status: 404, message: "missing chat" })
        .mockRejectedValueOnce({ status: 500, message: "server issue" });

    const { result, rerender } = renderChatHook(makeSelectedChat({ chatId: "chat-403" }));

    await waitFor(() => {
        expect(result.current.chatAccessError).toBe("You are not a member of this section chat.");
    });
    expect(result.current.canSendMessages).toBe(false);

    await act(async () => {
        rerender({ chat: makeSelectedChat({ chatId: "chat-404" }) });
    });

    await waitFor(() => {
        expect(result.current.chatAccessError).toBe("This chat is not available.");
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.canSendMessages).toBe(false);

    await act(async () => {
        rerender({ chat: makeSelectedChat({ chatId: "chat-500" }) });
    });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.chatAccessError).toBe("");
    expect(result.current.messages).toEqual([]);
    expect(result.current.canSendMessages).toBe(true);
});

test("emits typing and stop-typing on debounce and clears timeout during cleanup", async () => {
    vi.useFakeTimers();
    try {
        const { result, unmount } = renderChatHook();

        emitStopTypingMock.mockClear();
        act(() => {
            result.current.handleTyping();
            result.current.handleTyping();
        });

        expect(emitTypingMock).toHaveBeenCalledTimes(2);
        expect(emitStopTypingMock).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(1999);
        });
        expect(emitStopTypingMock).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(1);
        });
        expect(emitStopTypingMock).toHaveBeenCalledTimes(1);
        expect(emitStopTypingMock).toHaveBeenCalledWith("chat-1");

        emitStopTypingMock.mockClear();
        act(() => {
            result.current.handleTyping();
        });
        unmount();

        await act(async () => {
            vi.runAllTimers();
        });
        expect(emitStopTypingMock).toHaveBeenCalledTimes(0);
    } finally {
        vi.useRealTimers();
    }
});
