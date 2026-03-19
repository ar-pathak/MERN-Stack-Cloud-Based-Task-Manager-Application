import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  useWebRTCMock,
  useAuthMock,
  toggleChatMuteMock,
  toggleChatArchiveMock,
  addMembersToGroupMock,
  leaveGroupMock,
  leaveWorkspaceMock,
  leaveProjectMock,
  leaveTaskMock,
  leaveSubtaskMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  useWebRTCMock: vi.fn(),
  useAuthMock: vi.fn(),
  toggleChatMuteMock: vi.fn(),
  toggleChatArchiveMock: vi.fn(),
  addMembersToGroupMock: vi.fn(),
  leaveGroupMock: vi.fn(),
  leaveWorkspaceMock: vi.fn(),
  leaveProjectMock: vi.fn(),
  leaveTaskMock: vi.fn(),
  leaveSubtaskMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
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

vi.mock("../../../../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../../../features/main/features/overview/hook/useWebRTC", () => ({
  default: (...args) => useWebRTCMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args) => toastSuccessMock(...args),
    error: (...args) => toastErrorMock(...args),
  },
}));

vi.mock("../../../../../service/workspace.service", () => ({
  leaveWorkspace: (...args) => leaveWorkspaceMock(...args),
}));

vi.mock("../../../../../service/project.service", () => ({
  leaveProject: (...args) => leaveProjectMock(...args),
}));

vi.mock("../../../../../service/task.service", () => ({
  leaveTask: (...args) => leaveTaskMock(...args),
}));

vi.mock("../../../../../service/subtask.service", () => ({
  leaveSubtask: (...args) => leaveSubtaskMock(...args),
}));

vi.mock("../../../../../service/chat.service", () => ({
  addMembersToGroup: (...args) => addMembersToGroupMock(...args),
  leaveGroup: (...args) => leaveGroupMock(...args),
  toggleChatArchive: (...args) => toggleChatArchiveMock(...args),
  toggleChatMute: (...args) => toggleChatMuteMock(...args),
}));

vi.mock("../../../../../features/main/features/overview/components/infoSidebar/InfoSidebar", () => ({
  default: ({ item, initialTab }) => <div>Info Sidebar:{item.name || item.title}:{initialTab}</div>,
}));

vi.mock("../../../../../features/main/features/overview/components/chat/ChatHeader", () => ({
  default: ({ onToggleMute, onToggleArchive, onAddMembers, onLeave, onRequestInfo }) => (
    <div>
      <button onClick={onToggleMute}>Mute Toggle</button>
      <button onClick={onToggleArchive}>Archive Toggle</button>
      <button onClick={onAddMembers}>Add Members</button>
      <button onClick={onLeave}>Leave Chat</button>
      <button onClick={onRequestInfo}>Info Request</button>
    </div>
  ),
}));

vi.mock("../../../../../features/main/features/overview/components/chat/PinnedBanner", () => ({
  default: () => <div>Pinned Banner</div>,
}));

vi.mock("../../../../../features/main/features/overview/components/chat/MessageList", () => ({
  default: ({ messages }) => <div>Message List:{messages.length}</div>,
}));

vi.mock("../../../../../features/main/features/overview/components/chat/ChatInput", () => ({
  default: ({ sendDisabled, sendDisabledReason }) => (
    <div>Chat Input:{sendDisabled ? sendDisabledReason : "enabled"}</div>
  ),
}));

vi.mock("../../../../../features/main/features/overview/components/chat/CallInterface", () => ({
  default: ({ currentCall }) => <div>Call Interface:{currentCall ? "open" : "closed"}</div>,
}));

import ChatPanel from "../../../../../features/main/features/overview/components/chat/ChatPanel";

describe("overview chat panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { _id: "me", id: "me" } });
    useWebRTCMock.mockReturnValue({
      localStream: null,
      remoteStreams: new Map(),
      currentCall: null,
      callStatus: "idle",
      participants: [],
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      connectionQuality: {},
      activeSpeakerId: "",
      invitingUserIds: [],
      startCall: vi.fn(),
      joinCall: vi.fn(),
      leaveCall: vi.fn(),
      endCall: vi.fn(),
      inviteToCall: vi.fn(),
      toggleAudio: vi.fn(),
      toggleVideo: vi.fn(),
      toggleScreenShare: vi.fn(),
    });
    toggleChatMuteMock.mockResolvedValue({ muted: true });
    toggleChatArchiveMock.mockResolvedValue({ archived: true });
    addMembersToGroupMock.mockResolvedValue({ success: true });
    leaveGroupMock.mockResolvedValue({ success: true });
    leaveWorkspaceMock.mockResolvedValue({ success: true });
    leaveProjectMock.mockResolvedValue({ success: true });
    leaveTaskMock.mockResolvedValue({ success: true });
    leaveSubtaskMock.mockResolvedValue({ success: true });
    globalThis.window.prompt = vi.fn(() => "u2, u3");
    globalThis.window.confirm = vi.fn(() => true);
  });

  it("renders the info sidebar branch for section chats", () => {
    render(
      <ChatPanel
        item={{ id: "workspace-1", type: "workspace", name: "Workspace Alpha", permissions: { role: "owner" } }}
        messages={[]}
        chatMessage=""
        setChatMessage={vi.fn()}
        handleSendMessage={vi.fn()}
        showChatInfo
        setShowChatInfo={vi.fn()}
        chatEndRef={{ current: null }}
        selectedMessage={null}
        setSelectedMessage={vi.fn()}
        handleDeleteMessage={vi.fn()}
        handlePinMessage={vi.fn()}
        handleEditMessage={vi.fn()}
        handleReaction={vi.fn()}
        handleTyping={vi.fn()}
        fileInputRef={{ current: null }}
        uploadingFile={false}
        showEmojiPicker={false}
        setShowEmojiPicker={vi.fn()}
      />,
    );

    expect(screen.getByText("Info Sidebar:Workspace Alpha:overview")).toBeInTheDocument();
  });

  it("handles mute, archive, add-members, leave, and blocked-send states for group chats", async () => {
    const onRefreshChatMeta = vi.fn();
    const onLeaveSuccess = vi.fn();

    render(
      <ChatPanel
        item={{
          id: "chat-1",
          chatId: "chat-1",
          type: "chat",
          chatType: "group",
          title: "General",
          permissions: { role: "member" },
        }}
        messages={[{ _id: "m1" }]}
        chatMessage=""
        setChatMessage={vi.fn()}
        handleSendMessage={vi.fn()}
        showChatInfo={false}
        setShowChatInfo={vi.fn()}
        chatEndRef={{ current: null }}
        selectedMessage={null}
        setSelectedMessage={vi.fn()}
        handleDeleteMessage={vi.fn()}
        handlePinMessage={vi.fn()}
        handleEditMessage={vi.fn()}
        handleReaction={vi.fn()}
        handleTyping={vi.fn()}
        fileInputRef={{ current: null }}
        uploadingFile={false}
        showEmojiPicker={false}
        setShowEmojiPicker={vi.fn()}
        onRefreshChatMeta={onRefreshChatMeta}
        onLeaveSuccess={onLeaveSuccess}
        sendPermissionError="You do not have permission to send messages."
      />,
    );

    expect(screen.getAllByText(/You do not have permission to send messages/i)).toHaveLength(2);
    expect(screen.getByText(/Chat Input:You do not have permission/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Mute Toggle"));
    fireEvent.click(screen.getByText("Archive Toggle"));
    fireEvent.click(screen.getByText("Add Members"));
    fireEvent.click(screen.getByText("Leave Chat"));

    await waitFor(() => {
      expect(toggleChatMuteMock).toHaveBeenCalledWith("chat-1");
    });
    expect(toggleChatArchiveMock).toHaveBeenCalledWith("chat-1");
    expect(addMembersToGroupMock).toHaveBeenCalledWith("chat-1", ["u2", "u3"]);
    expect(leaveGroupMock).toHaveBeenCalledWith("chat-1");
    expect(toastSuccessMock).toHaveBeenCalledWith("Chat muted");
    expect(toastSuccessMock).toHaveBeenCalledWith("Chat archived");
    expect(toastSuccessMock).toHaveBeenCalledWith("Members added successfully");
    expect(toastSuccessMock).toHaveBeenCalledWith("You left the conversation");
    expect(onRefreshChatMeta).toHaveBeenCalled();
    expect(onLeaveSuccess).toHaveBeenCalledTimes(1);
  });

  it("forwards info requests back to the parent controller", () => {
    const setShowChatInfo = vi.fn();

    render(
      <ChatPanel
        item={{ id: "task-1", type: "task", title: "Build UI", permissions: { role: "creator" } }}
        messages={[]}
        chatMessage=""
        setChatMessage={vi.fn()}
        handleSendMessage={vi.fn()}
        showChatInfo={false}
        setShowChatInfo={setShowChatInfo}
        chatEndRef={{ current: null }}
        selectedMessage={null}
        setSelectedMessage={vi.fn()}
        handleDeleteMessage={vi.fn()}
        handlePinMessage={vi.fn()}
        handleEditMessage={vi.fn()}
        handleReaction={vi.fn()}
        handleTyping={vi.fn()}
        fileInputRef={{ current: null }}
        uploadingFile={false}
        showEmojiPicker={false}
        setShowEmojiPicker={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Info Request"));
    expect(setShowChatInfo).toHaveBeenCalledWith(true);
  });
});



