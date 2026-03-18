import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const {
    useAuthMock,
    getSocketMock,
    connectSocketMock,
    apiGetMock
} = vi.hoisted(() => ({
    useAuthMock: vi.fn(),
    getSocketMock: vi.fn(),
    connectSocketMock: vi.fn(),
    apiGetMock: vi.fn()
}));

vi.mock("../../../../../../context/AuthContext", () => ({
    useAuth: useAuthMock
}));

vi.mock("../../../../../../service/Chat.socket.service", () => ({
    getSocket: getSocketMock,
    connectSocket: connectSocketMock
}));

vi.mock("../../../../../../config/axios", () => ({
    default: {
        get: apiGetMock
    }
}));

import useWebRTC from "../../../../../../features/main/features/overview/hook/useWebRTC.js";

const createTrack = (kind, id) => ({
    id,
    kind,
    enabled: true,
    stop: vi.fn(),
    onended: null
});

class MockMediaStream {
    constructor(tracks = []) {
        this._tracks = [...tracks];
    }

    getTracks() {
        return [...this._tracks];
    }

    getAudioTracks() {
        return this._tracks.filter((track) => track.kind === "audio");
    }

    getVideoTracks() {
        return this._tracks.filter((track) => track.kind === "video");
    }

    addTrack(track) {
        if (!this._tracks.some((existing) => existing.id === track.id)) {
            this._tracks.push(track);
        }
    }
}

const peerConnections = [];

class MockRTCPeerConnection {
    constructor() {
        this.localDescription = null;
        this.remoteDescription = null;
        this.iceConnectionState = "new";
        this.connectionState = "new";
        this.signalingState = "stable";
        this.onicecandidate = null;
        this.oniceconnectionstatechange = null;
        this.onconnectionstatechange = null;
        this.ontrack = null;
        this._senders = [];
        this._transceivers = [];

        peerConnections.push(this);
    }

    addTrack(track) {
        const sender = {
            track,
            getParameters: vi.fn(() => ({ encodings: [{}] })),
            setParameters: vi.fn(async () => {}),
            replaceTrack: vi.fn(async (nextTrack) => {
                sender.track = nextTrack;
            })
        };
        this._senders.push(sender);
        return sender;
    }

    getSenders() {
        return this._senders;
    }

    getTransceivers() {
        return this._transceivers;
    }

    async createOffer() {
        return { type: "offer", sdp: "mock-offer" };
    }

    async setLocalDescription(description) {
        this.localDescription = description;
        if (description?.type === "offer") {
            this.signalingState = "have-local-offer";
        } else {
            this.signalingState = "stable";
        }
    }

    async createAnswer() {
        return { type: "answer", sdp: "mock-answer" };
    }

    async setRemoteDescription(description) {
        this.remoteDescription = description;
    }

    async addIceCandidate() {
        return undefined;
    }

    async getStats() {
        return new Map([
            [
                "pair",
                {
                    type: "candidate-pair",
                    state: "succeeded",
                    currentRoundTripTime: 0.12
                }
            ],
            [
                "audio",
                {
                    type: "inbound-rtp",
                    isRemote: false,
                    kind: "audio",
                    packetsReceived: 100,
                    packetsLost: 2,
                    jitter: 0.01
                }
            ]
        ]);
    }

    close() {
        this.connectionState = "closed";
        this.iceConnectionState = "closed";
    }
}

class MockRTCSessionDescription {
    constructor(init = {}) {
        this.type = init.type;
        this.sdp = init.sdp;
    }
}

class MockRTCIceCandidate {
    constructor(init = {}) {
        this.candidate = init.candidate;
        this.sdpMid = init.sdpMid ?? null;
        this.sdpMLineIndex = init.sdpMLineIndex ?? null;
        this.usernameFragment = init.usernameFragment ?? null;
    }
}

class MockAudioContext {
    constructor() {
        this.state = "running";
    }

    async resume() {
        this.state = "running";
    }

    async close() {
        this.state = "closed";
    }

    createMediaStreamSource() {
        return {
            connect: vi.fn(),
            disconnect: vi.fn()
        };
    }

    createGain() {
        return {
            connect: vi.fn(),
            disconnect: vi.fn(),
            gain: { value: 1 }
        };
    }

    createDynamicsCompressor() {
        return {
            connect: vi.fn(),
            disconnect: vi.fn(),
            threshold: { value: 0 },
            knee: { value: 0 },
            ratio: { value: 0 },
            attack: { value: 0 },
            release: { value: 0 }
        };
    }

    createMediaStreamDestination() {
        return {
            stream: new MockMediaStream([createTrack("audio", "processed-audio")])
        };
    }

    createAnalyser() {
        return {
            fftSize: 0,
            smoothingTimeConstant: 0,
            frequencyBinCount: 4,
            getByteFrequencyData: (arr) => arr.fill(0)
        };
    }
}

const createMockSocket = () => {
    const handlers = new Map();

    return {
        emit: vi.fn(),
        on: vi.fn((event, handler) => {
            handlers.set(event, handler);
        }),
        off: vi.fn((event) => {
            handlers.delete(event);
        }),
        trigger: async (event, payload) => {
            const handler = handlers.get(event);
            if (!handler) return undefined;
            return handler(payload);
        }
    };
};

const getEmits = (socket, eventName) =>
    socket.emit.mock.calls.filter((entry) => entry[0] === eventName);

const makeUserMediaStream = () =>
    new MockMediaStream([
        createTrack("video", "camera-video"),
        createTrack("audio", "mic-audio")
    ]);

const makeDisplayStream = () =>
    new MockMediaStream([createTrack("video", "screen-video")]);

const renderWebRTCHook = (chatId = "chat-1") =>
    renderHook(({ currentChatId }) => useWebRTC(currentChatId), {
        initialProps: { currentChatId: chatId }
    });

beforeEach(() => {
    vi.clearAllMocks();
    peerConnections.length = 0;

    const socket = createMockSocket();
    getSocketMock.mockReturnValue(socket);
    connectSocketMock.mockReturnValue(socket);

    useAuthMock.mockReturnValue({
        user: { _id: "me", name: "Tester" }
    });

    apiGetMock.mockResolvedValue({
        data: { data: { activeCall: null } }
    });

    Object.defineProperty(globalThis, "MediaStream", {
        value: MockMediaStream,
        configurable: true,
        writable: true
    });

    Object.defineProperty(globalThis, "RTCPeerConnection", {
        value: MockRTCPeerConnection,
        configurable: true,
        writable: true
    });

    Object.defineProperty(globalThis, "RTCSessionDescription", {
        value: MockRTCSessionDescription,
        configurable: true,
        writable: true
    });

    Object.defineProperty(globalThis, "RTCIceCandidate", {
        value: MockRTCIceCandidate,
        configurable: true,
        writable: true
    });

    Object.defineProperty(window, "AudioContext", {
        value: MockAudioContext,
        configurable: true,
        writable: true
    });

    Object.defineProperty(window, "webkitAudioContext", {
        value: MockAudioContext,
        configurable: true,
        writable: true
    });

    Object.defineProperty(navigator, "mediaDevices", {
        value: {
            getUserMedia: vi.fn(async () => makeUserMediaStream()),
            getDisplayMedia: vi.fn(async () => makeDisplayStream())
        },
        configurable: true
    });

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

test("joins/leaves the chat room and hydrates active call state", async () => {
    const socket = createMockSocket();
    getSocketMock.mockReturnValue(socket);
    connectSocketMock.mockReturnValue(socket);

    apiGetMock.mockResolvedValue({
        data: {
            data: {
                activeCall: {
                    _id: "call-1",
                    type: "video",
                    chatId: "chat-1",
                    chatMembers: [
                        { _id: "me", name: "Tester" },
                        { _id: "u2", name: "Alex" },
                        { _id: "u2", name: "Alex Duplicate" }
                    ],
                    activeParticipants: [
                        { userId: "me" },
                        { userId: "u2" },
                        { userId: "u3", leftAt: "2026-03-18T10:00:00.000Z" }
                    ]
                }
            }
        }
    });

    const { result, unmount } = renderWebRTCHook("chat-1");

    await waitFor(() => {
        expect(getEmits(socket, "join-chat")[0]?.[1]).toBe("chat-1");
    });

    await waitFor(() => {
        expect(result.current.currentCall?._id).toBe("call-1");
    });

    expect(result.current.currentCall.chatMembers).toHaveLength(2);
    expect(result.current.participants).toHaveLength(2);
    expect(result.current.callStatus).toBe("idle");

    unmount();
    expect(getEmits(socket, "leave-chat")[0]?.[1]).toBe("chat-1");
});

test("startCall and joinCall initialize media and emit call actions", async () => {
    const socket = createMockSocket();
    getSocketMock.mockReturnValue(socket);

    const { result } = renderWebRTCHook("chat-1");

    await act(async () => {
        await result.current.startCall("video");
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    expect(result.current.callStatus).toBe("initiating");
    expect(result.current.callError).toBeNull();
    expect(getEmits(socket, "call:start")[0]?.[1]).toMatchObject({
        chatId: "chat-1",
        type: "video"
    });

    await act(async () => {
        await result.current.joinCall("call-join-1", "audio");
    });

    expect(getEmits(socket, "call:join")[0]?.[1]).toEqual({
        callId: "call-join-1",
        mediaState: { video: false, audio: true }
    });
});

test("shows an error when startCall is attempted without a socket", async () => {
    getSocketMock.mockReturnValue(null);
    connectSocketMock.mockReturnValue(null);

    const { result } = renderWebRTCHook("chat-1");

    await act(async () => {
        await result.current.startCall("video");
    });

    expect(result.current.callError).toBe("No connection");
});

test("handles call events and invitation lifecycle updates", async () => {
    const socket = createMockSocket();
    getSocketMock.mockReturnValue(socket);

    const { result } = renderWebRTCHook("chat-1");

    await act(async () => {
        await socket.trigger("call:initiated", {
            callId: "call-42",
            callerId: "someone-else",
            type: "video",
            call: {
                participants: [{ userId: "someone-else" }, { userId: "me", leftAt: "x" }],
                chatMembers: [{ _id: "someone-else", name: "Other" }]
            }
        });
    });

    expect(result.current.currentCall?.callId || result.current.currentCall?._id).toBeTruthy();
    expect(result.current.callStatus).toBe("idle");
    expect(result.current.participants).toHaveLength(1);

    act(() => {
        result.current.inviteToCall(["u1", { _id: "u2" }, "u1", null, undefined]);
    });

    expect(result.current.invitingUserIds).toEqual(expect.arrayContaining(["u1", "u2"]));
    expect(getEmits(socket, "call:invite")[0]?.[1]).toEqual({
        callId: "call-42",
        targetUserIds: ["u1", "u2"]
    });

    await act(async () => {
        await socket.trigger("call:invite:sent", {
            invitedUserIds: ["u1"]
        });
    });

    expect(result.current.invitingUserIds).toEqual(["u2"]);

    await act(async () => {
        await socket.trigger("call:joined", {
            callId: "call-42",
            type: "audio",
            participants: [{ userId: "u2", mediaState: { audio: true } }],
            call: { type: "audio" }
        });
    });

    expect(result.current.callStatus).toBe("ongoing");
    expect(result.current.participants).toHaveLength(1);

    await act(async () => {
        await socket.trigger("call:participant-media-update", {
            userId: "u2",
            mediaState: { audio: false, video: true }
        });
    });

    expect(result.current.participants[0].mediaState).toMatchObject({
        audio: false,
        video: true
    });
});

test("negotiates peers with offer/answer/ice and handles participant leave", async () => {
    const socket = createMockSocket();
    getSocketMock.mockReturnValue(socket);

    const { result } = renderWebRTCHook("chat-1");

    await act(async () => {
        await result.current.startCall("video");
    });

    await act(async () => {
        await socket.trigger("call:joined", {
            callId: "call-55",
            participants: [{ userId: "me" }],
            call: { type: "video" }
        });
    });

    socket.emit.mockClear();

    await act(async () => {
        await socket.trigger("call:participant-joined", {
            participant: { userId: "peer-1" }
        });
    });

    expect(getEmits(socket, "call:offer")[0]?.[1]).toMatchObject({
        callId: "call-55",
        targetUserId: "peer-1"
    });

    await act(async () => {
        await socket.trigger("call:ice-candidate", {
            fromUserId: "peer-queue",
            candidate: { candidate: "queued-candidate" }
        });
    });

    await act(async () => {
        await socket.trigger("call:offer", {
            callId: "call-55",
            fromUserId: "peer-queue",
            offer: { type: "offer", sdp: "incoming-offer" }
        });
    });

    expect(getEmits(socket, "call:answer")[0]?.[1]).toMatchObject({
        callId: "call-55",
        targetUserId: "peer-queue"
    });

    await act(async () => {
        await socket.trigger("call:answer", {
            fromUserId: "peer-1",
            answer: { type: "answer", sdp: "incoming-answer" }
        });
    });

    expect(peerConnections.length).toBeGreaterThanOrEqual(2);

    const firstPeerConnection = peerConnections[0];
    firstPeerConnection.connectionState = "connected";
    await act(async () => {
        firstPeerConnection.onconnectionstatechange?.();
    });

    await waitFor(() => {
        expect(result.current.connectionQuality.has("peer-1")).toBe(true);
    });

    const remoteVideoTrack = createTrack("video", "remote-1");
    const remoteStream = new MockMediaStream([remoteVideoTrack]);
    await act(async () => {
        firstPeerConnection.ontrack?.({ track: remoteVideoTrack, streams: [remoteStream] });
    });

    expect(result.current.remoteStreams.get("peer-1")).toBeTruthy();

    await act(async () => {
        await socket.trigger("call:participant-left", { userId: "peer-1" });
    });

    expect(result.current.remoteStreams.has("peer-1")).toBe(false);
    expect(result.current.connectionQuality.has("peer-1")).toBe(false);
});

test("toggles audio/video and screen share with media-state events", async () => {
    const socket = createMockSocket();
    getSocketMock.mockReturnValue(socket);

    const { result } = renderWebRTCHook("chat-1");

    await act(async () => {
        await result.current.startCall("video");
    });

    await act(async () => {
        await socket.trigger("call:joined", {
            callId: "call-media",
            participants: [{ userId: "me" }],
            call: { type: "video" }
        });
    });

    await act(async () => {
        result.current.toggleAudio();
    });
    expect(result.current.isAudioEnabled).toBe(false);

    await act(async () => {
        result.current.toggleVideo();
    });
    expect(result.current.isVideoEnabled).toBe(false);

    await act(async () => {
        await result.current.toggleScreenShare();
    });

    expect(result.current.isScreenSharing).toBe(true);
    expect(result.current.callError).toBeNull();

    const mediaStateEmits = getEmits(socket, "call:media-state").map((entry) => entry[1]);
    expect(mediaStateEmits).toEqual(
        expect.arrayContaining([
            { callId: "call-media", mediaState: { audio: false } },
            { callId: "call-media", mediaState: { video: false } },
            {
                callId: "call-media",
                mediaState: {
                    video: true,
                    screenShare: true
                }
            }
        ])
    );

    const screenTrack = result.current.localStream.getVideoTracks()[0];
    await act(async () => {
        screenTrack.onended?.();
    });

    await waitFor(() => {
        expect(result.current.isScreenSharing).toBe(false);
    });

    expect(
        getEmits(socket, "call:media-state").some(
            ([, payload]) =>
                payload.callId === "call-media" &&
                payload.mediaState?.screenShare === false
        )
    ).toBe(true);
});

test("reports unsupported screen sharing and handles leave/end cleanup", async () => {
    const socket = createMockSocket();
    getSocketMock.mockReturnValue(socket);

    Object.defineProperty(navigator, "mediaDevices", {
        value: {
            getUserMedia: vi.fn(async () => makeUserMediaStream())
        },
        configurable: true
    });

    const { result } = renderWebRTCHook("chat-1");

    await act(async () => {
        await result.current.startCall("video");
    });

    await act(async () => {
        await socket.trigger("call:joined", {
            callId: "call-cleanup",
            participants: [{ userId: "me" }],
            call: { type: "video" }
        });
    });

    await act(async () => {
        await result.current.toggleScreenShare();
    });

    expect(result.current.callError).toBe("Screen share is not supported in this browser.");

    act(() => {
        result.current.leaveCall();
    });

    await waitFor(() => {
        expect(result.current.callStatus).toBe("idle");
    });

    expect(getEmits(socket, "call:leave")[0]?.[1]).toEqual({ callId: "call-cleanup" });
    expect(result.current.localStream).toBeNull();

    await act(async () => {
        await result.current.startCall("audio");
    });

    await act(async () => {
        await socket.trigger("call:joined", {
            callId: "call-end",
            participants: [{ userId: "me" }],
            call: { type: "audio" }
        });
    });

    act(() => {
        result.current.endCall();
    });

    expect(getEmits(socket, "call:end")[0]?.[1]).toEqual({ callId: "call-end" });
});
