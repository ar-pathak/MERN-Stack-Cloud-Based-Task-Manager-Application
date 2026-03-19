import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, useAuthMock, searchMentionCandidatesMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useAuthMock: vi.fn(),
  searchMentionCandidatesMock: vi.fn(),
}));

vi.mock("framer-motion", async () => {
  const React = await vi.importActual("react");
  const make = (tag) => ({ children, initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, ...props }) =>
    React.createElement(typeof tag === "string" ? tag : "div", props, children);
  return {
    motion: new Proxy({}, { get: (_target, tag) => make(tag) }),
    AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../../../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../../../service/user.service", () => ({
  searchMentionCandidates: (...args) => searchMentionCandidatesMock(...args),
}));

import CallInterface from "../../../../../features/main/features/overview/components/chat/CallInterface";
import ChatHeader from "../../../../../features/main/features/overview/components/chat/ChatHeader";
import ChatInput from "../../../../../features/main/features/overview/components/chat/ChatInput";
import ChatMessage from "../../../../../features/main/features/overview/components/chat/ChatMessage";
import MessageList from "../../../../../features/main/features/overview/components/chat/MessageList";
import PinnedBanner from "../../../../../features/main/features/overview/components/chat/PinnedBanner";

const createStream = (label) => ({
  getVideoTracks: () => [{ label }],
});

const ChatInputHarness = ({ handleSend }) => {
  const [chatMessage, setChatMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  return (
    <ChatInput
      chatMessage={chatMessage}
      setChatMessage={setChatMessage}
      handleSend={handleSend}
      fileInputRef={fileInputRef}
      uploadingFile={false}
      replyingTo={replyingTo}
      setReplyingTo={setReplyingTo}
      showEmojiPicker={showEmojiPicker}
      setShowEmojiPicker={setShowEmojiPicker}
      selectedFile={selectedFile}
      setSelectedFile={setSelectedFile}
      chatId="chat-1"
      mentionEnabled
    />
  );
};

describe("overview chat components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { _id: "me", id: "me", username: "riya" } });
    searchMentionCandidatesMock.mockResolvedValue([
      { _id: "user-2", name: "Riya Sharma", username: "riya", isOnline: true },
    ]);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn() },
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => ({ cancel: vi.fn() })),
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return this._srcObject;
      },
      set(value) {
        this._srcObject = value;
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn(() => Promise.resolve()),
    });
  });

  it("renders chat header search and dm profile navigation", () => {
    const setSearchQuery = vi.fn();
    const setMessageFilter = vi.fn();

    render(
      <ChatHeader
        item={{
          type: "dm",
          chatType: "private",
          name: "Alex",
          userId: "user-2",
          isOnline: true,
        }}
        typingMembers={[]}
        showSearch
        setShowSearch={vi.fn()}
        searchQuery=""
        setSearchQuery={setSearchQuery}
        messageFilter="all"
        setMessageFilter={setMessageFilter}
      />,
    );

    fireEvent.click(screen.getByText("Alex"));
    fireEvent.change(screen.getByPlaceholderText(/Search messages/i), {
      target: { value: "report" },
    });
    fireEvent.change(screen.getByDisplayValue("All messages"), {
      target: { value: "files" },
    });

    expect(navigateMock).toHaveBeenCalledWith("/profile/user-2");
    expect(setSearchQuery).toHaveBeenCalledWith("report");
    expect(setMessageFilter).toHaveBeenCalledWith("files");
  });

  it("opens group header actions for add members, mute, archive, and leave", () => {
    const onAddMembers = vi.fn();
    const onToggleMute = vi.fn();
    const onToggleArchive = vi.fn();
    const onLeave = vi.fn();

    const { container } = render(
      <ChatHeader
        item={{
          id: "workspace-1",
          type: "workspace",
          name: "Workspace Alpha",
          muted: false,
          archived: false,
          members: [{ _id: "me", isOnline: true }, { _id: "u2", isOnline: false }],
        }}
        typingMembers={[]}
        showSearch={false}
        setShowSearch={vi.fn()}
        searchQuery=""
        setSearchQuery={vi.fn()}
        messageFilter="all"
        setMessageFilter={vi.fn()}
        onAddMembers={onAddMembers}
        onToggleMute={onToggleMute}
        onToggleArchive={onToggleArchive}
        onLeave={onLeave}
        onRequestInfo={vi.fn()}
      />,
    );

    const openMenu = () => {
      const buttons = container.querySelectorAll("button");
      fireEvent.click(buttons[buttons.length - 1]);
    };

    openMenu();
    fireEvent.click(screen.getByText("Add members"));
    openMenu();
    fireEvent.click(screen.getByText("Mute"));
    openMenu();
    fireEvent.click(screen.getByText("Archive"));
    openMenu();
    fireEvent.click(screen.getByText("Leave group"));

    expect(onAddMembers).toHaveBeenCalledTimes(1);
    expect(onToggleMute).toHaveBeenCalledTimes(1);
    expect(onToggleArchive).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("supports mention suggestions, file previews, and sending from chat input", async () => {
    const handleSend = vi.fn();
    const { container } = render(<ChatInputHarness handleSend={handleSend} />);

    const textarea = screen.getByPlaceholderText(/Use @ to mention/i);
    fireEvent.change(textarea, {
      target: { value: "Hey @ri", selectionStart: 7 },
    });
    fireEvent.keyUp(textarea, {
      target: { value: "Hey @ri", selectionStart: 7 },
    });

    await waitFor(() => {
      expect(searchMentionCandidatesMock).toHaveBeenCalledWith("ri", {
        chatId: "chat-1",
        limit: 8,
      });
    });

    fireEvent.mouseDown(screen.getByText("Riya Sharma"));

    await waitFor(() => {
      expect(textarea.value).toBe("Hey @riya ");
    });

    const file = new File(["image"], "preview.png", { type: "image/png" });
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });

    expect(screen.getByText("preview.png")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button").at(-1));

    expect(handleSend).toHaveBeenCalledWith(file);
  });

  it("renders chat message mentions and hover actions", async () => {
    vi.useFakeTimers();
    try {
      const onReply = vi.fn();
      const handlePinMessage = vi.fn();
      const handleDeleteMessage = vi.fn();
      const { container } = render(
        <ChatMessage
          message={{
            _id: "message-1",
            content: "Hello @alex",
            createdAt: "2026-03-18T10:00:00.000Z",
            senderId: { _id: "me", name: "Riya" },
            mentions: [{ _id: "user-2", username: "alex" }],
            reactions: [],
          }}
          handleDeleteMessage={handleDeleteMessage}
          handlePinMessage={handlePinMessage}
          handleEditMessage={vi.fn()}
          onReact={vi.fn()}
          onReply={onReply}
        />,
      );

      fireEvent.click(screen.getByText("@alex"));
      expect(navigateMock).toHaveBeenCalledWith("/profile/user-2");

      fireEvent.mouseEnter(container.querySelector('[class*="group/bubble"]'));
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      fireEvent.click(screen.getByTitle("Copy"));
      fireEvent.click(screen.getByTitle("Reply"));
      fireEvent.click(screen.getByTitle("Pin"));
      fireEvent.click(screen.getByTitle("Delete"));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Hello @alex");
      expect(onReply).toHaveBeenCalledWith(expect.objectContaining({ _id: "message-1" }));
      expect(handlePinMessage).toHaveBeenCalledWith("message-1");
      expect(handleDeleteMessage).toHaveBeenCalledWith("message-1");
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders empty and jump-to-message states in the message list", async () => {
    const { rerender } = render(
      <MessageList
        messages={[]}
        itemType="workspace"
        selectedMessage={null}
        setSelectedMessage={vi.fn()}
        handleDeleteMessage={vi.fn()}
        handlePinMessage={vi.fn()}
        handleEditMessage={vi.fn()}
        onReact={vi.fn()}
        onReply={vi.fn()}
        chatEndRef={{ current: { scrollIntoView: vi.fn() } }}
      />,
    );

    expect(screen.getByText(/No messages yet/i)).toBeInTheDocument();

    vi.useFakeTimers();
    try {
      const onJumpHandled = vi.fn();
      rerender(
        <MessageList
          messages={[
            {
              _id: "m1",
              content: "Morning",
              createdAt: "2026-03-18T09:00:00.000Z",
              senderId: { _id: "u1", name: "Alex" },
              reactions: [],
            },
            {
              _id: "m2",
              content: "Jump here",
              createdAt: "2026-03-18T09:01:00.000Z",
              senderId: { _id: "u2", name: "Riya" },
              reactions: [],
            },
          ]}
          itemType="workspace"
          selectedMessage={null}
          setSelectedMessage={vi.fn()}
          handleDeleteMessage={vi.fn()}
          handlePinMessage={vi.fn()}
          handleEditMessage={vi.fn()}
          onReact={vi.fn()}
          onReply={vi.fn()}
          chatEndRef={{ current: { scrollIntoView: vi.fn() } }}
          jumpToMessageId="m2"
          onJumpHandled={onJumpHandled}
        />,
      );

      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(onJumpHandled).toHaveBeenCalledWith("m2");
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("cycles pinned messages and exposes jump, unpin, and view-all actions", () => {
    const onJumpToMessage = vi.fn();
    const onTogglePin = vi.fn();
    const onViewPinned = vi.fn();

    render(
      <PinnedBanner
        pinnedMessages={[
          {
            _id: "p1",
            content: "Pinned one",
            pinnedAt: "2026-03-18T10:00:00.000Z",
            senderId: { name: "Alex" },
          },
          {
            _id: "p2",
            content: "Pinned two",
            pinnedAt: "2026-03-18T11:00:00.000Z",
            senderId: { name: "Riya" },
          },
        ]}
        onViewPinned={onViewPinned}
        onJumpToMessage={onJumpToMessage}
        onTogglePin={onTogglePin}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Next pinned message/i));
    fireEvent.click(screen.getByRole("button", { name: /Jump/i }));
    fireEvent.click(screen.getByRole("button", { name: /Unpin/i }));
    fireEvent.click(screen.getByRole("button", { name: /View all/i }));
    fireEvent.click(screen.getByLabelText(/Collapse pinned banner/i));

    expect(onJumpToMessage).toHaveBeenCalledWith("p1");
    expect(onTogglePin).toHaveBeenCalledWith("p1");
    expect(onViewPinned).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/2 pinned messages/i)).toBeInTheDocument();
  });

  it("lets users join calls from the bar view", () => {
    const onJoinCall = vi.fn();

    render(
      <CallInterface
        isHost={false}
        currentCall={{ callId: "call-1", type: "audio", chatId: { name: "Standup" } }}
        callStatus="ringing"
        localStream={null}
        remoteStreams={new Map()}
        participants={[]}
        isAudioEnabled
        isVideoEnabled
        isScreenSharing={false}
        connectionQuality={{}}
        activeSpeakerId=""
        onToggleAudio={vi.fn()}
        onToggleVideo={vi.fn()}
        onToggleScreenShare={vi.fn()}
        onLeaveCall={vi.fn()}
        onEndCall={vi.fn()}
        onJoinCall={onJoinCall}
        onInviteParticipant={vi.fn()}
        activeUserId="me"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Join/i }));
    expect(onJoinCall).toHaveBeenCalledWith("call-1", "audio");
  });

  it("shows full call view with inviteable members", () => {
    const onInviteParticipant = vi.fn();

    render(
      <CallInterface
        isHost={false}
        currentCall={{
          _id: "call-2",
          mode: "group",
          type: "video",
          chatId: { name: "Sprint Sync" },
          chatMembers: [
            { _id: "me", name: "Riya" },
            { _id: "u2", name: "Alex" },
            { _id: "u3", name: "Sam" },
          ],
        }}
        callStatus="ongoing"
        localStream={createStream("local camera")}
        remoteStreams={new Map([["u2", createStream("remote camera")]])}
        participants={[
          { userId: { _id: "me", name: "Riya" } },
          { userId: { _id: "u2", name: "Alex" } },
        ]}
        isAudioEnabled
        isVideoEnabled
        isScreenSharing={false}
        connectionQuality={{ u2: { quality: "good" } }}
        activeSpeakerId="u2"
        onToggleAudio={vi.fn()}
        onToggleVideo={vi.fn()}
        onToggleScreenShare={vi.fn()}
        onLeaveCall={vi.fn()}
        onEndCall={vi.fn()}
        onJoinCall={vi.fn()}
        onInviteParticipant={onInviteParticipant}
        activeUserId="me"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Invite/i }));

    expect(screen.getByText("Sprint Sync")).toBeInTheDocument();
    expect(screen.getByText(/Alex speaking/i)).toBeInTheDocument();
    expect(onInviteParticipant).toHaveBeenCalledWith(["u3"]);
  });
});


