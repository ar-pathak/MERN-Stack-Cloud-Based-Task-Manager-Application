import { beforeEach, expect, test, vi } from "vitest";

const { ioMock, socketMock } = vi.hoisted(() => {
    const socketMock = {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        disconnect: vi.fn(),
        id: "socket-1",
    };

    return {
        ioMock: vi.fn(() => socketMock),
        socketMock,
    };
});

vi.mock("socket.io-client", () => ({
    io: ioMock,
}));

import {
    connectSocket,
    disconnectSocket,
    emitCallInvite,
    emitMessageDeleted,
    emitMessageEdited,
    emitMessageRead,
    emitSendMessage,
    emitStopTyping,
    emitTyping,
    getSocket,
    onCallEnded,
    onCallIncoming,
    onCallInitiated,
    onCallInvited,
    onCallInviteSent,
    onMessageDeleted,
    onMessageEdited,
    onMessagePinUpdated,
    onMessageRead,
    onNotificationAllRead,
    onNotificationBulk,
    onNotificationDeleted,
    onNotificationNew,
    onNotificationUnreadCount,
    onNotificationUpdated,
    onOverviewUnread,
    onOverviewUnreadReset,
    onOverviewUpdate,
    onReactionUpdated,
    onReceiveMessage,
    onStopTyping,
    onTyping,
    onUserStatus,
} from "../../service/Chat.socket.service.js";

beforeEach(() => {
    disconnectSocket();
    ioMock.mockClear();
    socketMock.emit.mockClear();
    socketMock.on.mockClear();
    socketMock.off.mockClear();
    socketMock.disconnect.mockClear();
});

test("connectSocket caches the socket and disconnects cleanly", () => {
    const socket = connectSocket("token-1");
    expect(socket).toBe(socketMock);
    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(ioMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
            auth: { token: "token-1" },
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            transports: ["websocket", "polling"],
        })
    );
    expect(getSocket()).toBe(socketMock);

    const cached = connectSocket("token-2");
    expect(cached).toBe(socketMock);
    expect(ioMock).toHaveBeenCalledTimes(1);

    disconnectSocket();
    expect(socketMock.disconnect).toHaveBeenCalled();
    expect(getSocket()).toBeNull();
});

test("emitters only fire when the socket exists", () => {
    emitSendMessage("chat-1", { id: "m1" });
    emitTyping("chat-1");
    emitStopTyping("chat-1");
    emitMessageRead("chat-1", "msg-1");
    emitMessageDeleted("chat-1", "msg-2");
    emitMessageEdited("chat-1", "msg-3", "edited");
    emitCallInvite("call-1", ["u1"]);
    expect(socketMock.emit).not.toHaveBeenCalled();

    connectSocket();
    socketMock.emit.mockClear();

    emitSendMessage("chat-1", { id: "m1" });
    emitTyping("chat-1");
    emitStopTyping("chat-1");
    emitMessageRead("chat-1", "msg-1");
    emitMessageDeleted("chat-1", "msg-2");
    emitMessageEdited("chat-1", "msg-3", "edited");
    emitCallInvite("call-1", ["u1"]);

    expect(socketMock.emit).toHaveBeenCalledWith("chat:send", { chatId: "chat-1", message: { id: "m1" } });
    expect(socketMock.emit).toHaveBeenCalledWith("chat:typing", { chatId: "chat-1" });
    expect(socketMock.emit).toHaveBeenCalledWith("chat:stop_typing", { chatId: "chat-1" });
    expect(socketMock.emit).toHaveBeenCalledWith("chat:read", { chatId: "chat-1", lastReadMessageId: "msg-1" });
    expect(socketMock.emit).toHaveBeenCalledWith("chat:message_deleted", { chatId: "chat-1", messageId: "msg-2" });
    expect(socketMock.emit).toHaveBeenCalledWith("chat:message_edited", {
        chatId: "chat-1",
        messageId: "msg-3",
        content: "edited",
    });
    expect(socketMock.emit).toHaveBeenCalledWith("call:invite", { callId: "call-1", targetUserIds: ["u1"] });
});

test("listener helpers attach and detach properly", () => {
    const callback = vi.fn();
    const off = onReceiveMessage(callback);

    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(socketMock.on).toHaveBeenCalledWith("chat:receive", callback);

    off();
    expect(socketMock.off).toHaveBeenCalledWith("chat:receive", callback);

    const listenerCases = [
        { fn: onTyping, event: "chat:typing" },
        { fn: onStopTyping, event: "chat:stop_typing" },
        { fn: onMessageRead, event: "chat:read_update" },
        { fn: onUserStatus, event: "user:status" },
        { fn: onOverviewUpdate, event: "overview:update" },
        { fn: onOverviewUnread, event: "overview:unread" },
        { fn: onOverviewUnreadReset, event: "overview:unread_reset" },
        { fn: onMessageDeleted, event: "chat:message_deleted" },
        { fn: onMessageEdited, event: "chat:message_edited" },
        { fn: onReactionUpdated, event: "chat:reaction_updated" },
        { fn: onMessagePinUpdated, event: "chat:message_pin_updated" },
        { fn: onCallIncoming, event: "call:incoming" },
        { fn: onCallInitiated, event: "call:initiated" },
        { fn: onCallEnded, event: "call:ended" },
        { fn: onCallInvited, event: "call:invited" },
        { fn: onCallInviteSent, event: "call:invite:sent" },
        { fn: onNotificationNew, event: "notification:new" },
        { fn: onNotificationUpdated, event: "notification:updated" },
        { fn: onNotificationDeleted, event: "notification:deleted" },
        { fn: onNotificationBulk, event: "notification:bulk" },
        { fn: onNotificationAllRead, event: "notification:all_read" },
        { fn: onNotificationUnreadCount, event: "notification:unread_count" },
    ];

    listenerCases.forEach(({ fn, event }) => {
        fn(callback);
        expect(socketMock.on).toHaveBeenCalledWith(event, callback);
    });
});
