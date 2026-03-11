import { beforeEach, expect, test, vi } from "vitest";

const { axiosMock, ioMock, socketMock, socketHandlers } = vi.hoisted(() => {
    const socketHandlers = {};
    const socketMock = {
        emit: vi.fn(),
        on: vi.fn((event, handler) => {
            socketHandlers[event] = handler;
        }),
    };

    return {
        axiosMock: {
            get: vi.fn(),
            post: vi.fn(),
        },
        ioMock: vi.fn(() => socketMock),
        socketMock,
        socketHandlers,
    };
});

vi.mock("axios", () => ({
    default: axiosMock,
}));

vi.mock("socket.io-client", () => ({
    io: ioMock,
}));

import callService from "../../service/call.service.js";

beforeEach(() => {
    axiosMock.get.mockReset();
    axiosMock.post.mockReset();
    ioMock.mockClear();
    socketMock.emit.mockReset();
    socketMock.on.mockClear();
    Object.keys(socketHandlers).forEach((key) => delete socketHandlers[key]);

    callService.socket = null;
    callService.listeners = new Map();
});

test("call service REST methods return response data", async () => {
    axiosMock.get.mockResolvedValueOnce({ data: { history: [] } });
    await expect(callService.getHistory({ page: 1 })).resolves.toEqual({ history: [] });
    expect(axiosMock.get).toHaveBeenCalledWith("/api/calls/history", { params: { page: 1 } });

    axiosMock.get.mockResolvedValueOnce({ data: { active: null } });
    await expect(callService.getActiveCall()).resolves.toEqual({ active: null });
    expect(axiosMock.get).toHaveBeenCalledWith("/api/calls/active");

    axiosMock.get.mockResolvedValueOnce({ data: { total: 3 } });
    await expect(callService.getStats()).resolves.toEqual({ total: 3 });
    expect(axiosMock.get).toHaveBeenCalledWith("/api/calls/stats/overview", { params: { period: 30 } });

    axiosMock.get.mockResolvedValueOnce({ data: { total: 1 } });
    await expect(callService.getStats(7)).resolves.toEqual({ total: 1 });
    expect(axiosMock.get).toHaveBeenCalledWith("/api/calls/stats/overview", { params: { period: 7 } });

    axiosMock.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(callService.submitFeedback("call-1", { rating: 5 })).resolves.toEqual({ ok: true });
    expect(axiosMock.post).toHaveBeenCalledWith("/api/calls/call-1/feedback", { rating: 5 });
});

test("call service socket emits and listener wiring works", () => {
    callService.initSocket("token-1");
    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(ioMock).toHaveBeenCalledWith({
        auth: { token: "token-1" },
        transports: ["websocket"],
    });
    expect(socketMock.on).toHaveBeenCalledWith("call:incoming", expect.any(Function));

    callService.initSocket("token-2");
    expect(ioMock).toHaveBeenCalledTimes(1);

    const onIncoming = vi.fn();
    callService.on("onIncomingCall", onIncoming);
    socketHandlers["call:incoming"]({ callId: "call-1" });
    expect(onIncoming).toHaveBeenCalledWith({ callId: "call-1" });

    callService.startCall("chat-1", "audio");
    callService.joinCall("call-1", { video: false, audio: true });
    callService.sendOffer("call-1", { sdp: "offer" }, "user-1");
    callService.sendAnswer("call-1", { sdp: "answer" }, "user-2");
    callService.sendIceCandidate("call-1", { candidate: "ice" }, "user-3");
    callService.updateMediaState("call-1", { video: true, audio: false });
    callService.leaveCall("call-1");
    callService.endCall("call-1");

    expect(socketMock.emit).toHaveBeenCalledWith("call:start", { chatId: "chat-1", type: "audio" });
    expect(socketMock.emit).toHaveBeenCalledWith("call:join", {
        callId: "call-1",
        mediaState: { video: false, audio: true },
    });
    expect(socketMock.emit).toHaveBeenCalledWith("call:offer", {
        callId: "call-1",
        offer: { sdp: "offer" },
        targetUserId: "user-1",
    });
    expect(socketMock.emit).toHaveBeenCalledWith("call:answer", {
        callId: "call-1",
        answer: { sdp: "answer" },
        targetUserId: "user-2",
    });
    expect(socketMock.emit).toHaveBeenCalledWith("call:ice-candidate", {
        callId: "call-1",
        candidate: { candidate: "ice" },
        targetUserId: "user-3",
    });
    expect(socketMock.emit).toHaveBeenCalledWith("call:media-state", {
        callId: "call-1",
        mediaState: { video: true, audio: false },
    });
    expect(socketMock.emit).toHaveBeenCalledWith("call:leave", { callId: "call-1" });
    expect(socketMock.emit).toHaveBeenCalledWith("call:end", { callId: "call-1" });
});
