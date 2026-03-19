import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  dispatchMock,
  selectorState,
  getOverviewActivityMock,
  getConversationsMock,
  createWorkspaceMock,
  createProjectMock,
  createSubtaskMock,
  useChatLogicMock,
  useOverviewRealtimeMock,
  useAuthMock,
  onUserStatusMock,
  statusCallbackRef,
} = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  selectorState: {
    current: {
      overview: {
        overviewData: {
          timeline: [
            { id: "workspace-1", _id: "workspace-1", type: "workspace", name: "Workspace Alpha", permissions: { role: "owner" } },
          ],
        },
        workspacePopupOpen: false,
        taskPopupOpen: false,
        isSubtaskPopupOpen: false,
        isProjectPopupOpen: false,
      },
    },
  },
  getOverviewActivityMock: vi.fn(),
  getConversationsMock: vi.fn(),
  createWorkspaceMock: vi.fn(),
  createProjectMock: vi.fn(),
  createSubtaskMock: vi.fn(),
  useChatLogicMock: vi.fn(),
  useOverviewRealtimeMock: vi.fn(),
  useAuthMock: vi.fn(),
  onUserStatusMock: vi.fn(),
  statusCallbackRef: { current: null },
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

vi.mock("react-redux", () => ({
  useDispatch: () => dispatchMock,
  useSelector: (selector) => selector(selectorState.current),
}));

vi.mock("../../../../../store/slice/overviewSlice", () => ({
  setOverviewData: (payload) => ({ type: "overview/setOverviewData", payload }),
  setTaskPopupOpen: (payload) => ({ type: "overview/setTaskPopupOpen", payload }),
  setWorkspacePopupOpen: (payload) => ({ type: "overview/setWorkspacePopupOpen", payload }),
  setIsProjectPopupOpen: (payload) => ({ type: "overview/setIsProjectPopupOpen", payload }),
  setIsSubtaskPopupOpen: (payload) => ({ type: "overview/setIsSubtaskPopupOpen", payload }),
}));

vi.mock("../../../../../service/overview.service", () => ({
  getOverviewActivity: (...args) => getOverviewActivityMock(...args),
}));

vi.mock("../../../../../service/chat.service", () => ({
  getConversations: (...args) => getConversationsMock(...args),
}));

vi.mock("../../../../../service/workspace.service", () => ({
  createWorkspace: (...args) => createWorkspaceMock(...args),
}));

vi.mock("../../../../../service/project.service", () => ({
  createProject: (...args) => createProjectMock(...args),
}));

vi.mock("../../../../../service/subtask.service", () => ({
  createSubtask: (...args) => createSubtaskMock(...args),
}));

vi.mock("../../../../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../../../service/Chat.socket.service", () => ({
  onUserStatus: (handler) => {
    statusCallbackRef.current = handler;
    onUserStatusMock(handler);
    return vi.fn();
  },
}));

vi.mock("../../../../../features/main/features/overview/hook/useChatLogic", () => ({
  useChatLogic: (...args) => useChatLogicMock(...args),
}));

vi.mock("../../../../../features/main/features/overview/hook/useOverviewRealtime", () => ({
  useOverviewRealtime: (...args) => useOverviewRealtimeMock(...args),
}));

vi.mock("../../../../../features/main/features/overview/utils/overviewTimeline", () => ({
  applySidebarActivityUpdate: (timeline) => timeline,
  applyUnreadUpdate: (timeline) => timeline,
  enrichTimeline: (timeline) => timeline,
  filterTimelineItems: (timeline) => timeline,
  getItemChatId: (item) => String(item?.chatId || item?.id || item?._id || ""),
  getProjectOptions: () => [],
  getWorkspaceOptions: () => [],
  normalizeOverviewNode: (item) => item,
}));

vi.mock("../../../../../features/main/features/overview/components/chat/ChatPanel", () => ({
  default: ({ item, jumpToMessageId }) => (
    <div>
      <div>Chat Panel:{item?.name || item?.title}</div>
      <div>Jump:{jumpToMessageId || "none"}</div>
    </div>
  ),
}));

vi.mock("../../../../../features/main/features/overview/components/EmptyState", () => ({
  default: () => <div>Empty Overview State</div>,
}));

vi.mock("../../../../../features/main/features/overview/components/SidebarHeader", () => ({
  default: ({ onCreateGlobalTask }) => (
    <div>
      <button onClick={onCreateGlobalTask}>Create Global Task</button>
    </div>
  ),
}));

vi.mock("../../../../../features/main/features/overview/components/sidebar/EmptyTimelineState", () => ({
  default: ({ onCreateWorkspace, onCreateTask }) => (
    <div>
      <button onClick={onCreateWorkspace}>Create Workspace Empty</button>
      <button onClick={onCreateTask}>Create Task Empty</button>
    </div>
  ),
}));

vi.mock("../../../../../features/main/features/overview/components/sidebar/NoResultsState", () => ({
  default: () => <div>No Results State</div>,
}));

vi.mock("../../../../../features/main/features/overview/components/sidebar/TimelineItemsList", () => ({
  default: ({ items, setSelectedItem, onOpenMention }) => (
    <div>
      {items.map((item) => (
        <button key={item.id} onClick={() => setSelectedItem(item)}>
          Select {item.name || item.title}
        </button>
      ))}
      <button
        onClick={() =>
          onOpenMention({
            id: "workspace-1",
            _id: "workspace-1",
            type: "workspace",
            name: "Workspace Alpha",
            chatId: "workspace-1",
            nextMentionMessageId: "mention-2",
            permissions: { role: "owner" },
          })
        }
      >
        Open Mention
      </button>
    </div>
  ),
}));

vi.mock("../../../../../features/main/features/overview/components/sidebar/TimelineSkeleton", () => ({
  default: () => <div>Timeline Skeleton</div>,
}));

vi.mock("../../../../../features/main/components/popup/WorkspacePopup", () => ({
  default: () => <div>Workspace Popup</div>,
}));

vi.mock("../../../../../features/main/components/popup/TaskPopup", () => ({
  default: ({ level }) => <div>Task Popup:{level}</div>,
}));

vi.mock("../../../../../features/main/components/popup/SubtaskPopup", () => ({
  default: () => <div>Subtask Popup</div>,
}));

vi.mock("../../../../../features/main/components/popup/ProjectPopup", () => ({
  default: () => <div>Project Popup</div>,
}));

vi.mock("../../../../../features/main/components/navigation/MobileBottomNav", () => ({
  default: () => <div>Mobile Bottom Nav</div>,
}));

import OverviewLayout from "../../../../../features/main/features/overview/pages/OverviewLayout";

beforeEach(() => {
  vi.clearAllMocks();

  selectorState.current = {
    overview: {
      overviewData: {
        timeline: [
          { id: "workspace-1", _id: "workspace-1", type: "workspace", name: "Workspace Alpha", permissions: { role: "owner" } },
        ],
      },
      workspacePopupOpen: false,
      taskPopupOpen: false,
      isSubtaskPopupOpen: false,
      isProjectPopupOpen: false,
    },
  };

  getOverviewActivityMock.mockResolvedValue({
    data: {
      data: [
        { id: "workspace-1", _id: "workspace-1", type: "workspace", name: "Workspace Alpha", permissions: { role: "owner" } },
      ],
    },
  });
  getConversationsMock.mockResolvedValue([
    {
      _id: "workspace-1",
      type: "group",
      muted: false,
      archived: false,
      members: [{ _id: "me", name: "Riya", isOnline: true }],
    },
  ]);
  createWorkspaceMock.mockResolvedValue({ _id: "workspace-2" });
  createProjectMock.mockResolvedValue({ _id: "project-1" });
  createSubtaskMock.mockResolvedValue({ _id: "subtask-1" });

  useAuthMock.mockReturnValue({ user: { _id: "me", id: "me" } });
  useChatLogicMock.mockReturnValue({
    messages: [],
    isLoading: false,
    chatMessage: "",
    setChatMessage: vi.fn(),
    handleSendMessage: vi.fn(),
    showChatInfo: false,
    setShowChatInfo: vi.fn(),
    selectedMessage: null,
    setSelectedMessage: vi.fn(),
    handleDeleteMessage: vi.fn(),
    handlePinMessage: vi.fn(),
    handleEditMessage: vi.fn(),
    handleReaction: vi.fn(),
    handleTyping: vi.fn(),
    isTyping: false,
    typingUsers: [],
    handleFileUpload: vi.fn(),
    uploadingFile: false,
    showEmojiPicker: false,
    setShowEmojiPicker: vi.fn(),
    chatAccessError: "",
    sendPermissionError: "",
    canSendMessages: true,
    refs: {
      chatEndRef: { current: null },
      fileInputRef: { current: null },
      messageInputRef: { current: null },
    },
  });
  useOverviewRealtimeMock.mockReturnValue({
    activeCallsByChatId: {},
    mentionByChatId: {},
    callInviteByChatId: {},
    refreshUnreadMentions: vi.fn(),
    refreshUnreadCallInvites: vi.fn(),
  });
});

describe("overview layout", () => {
  it("loads timeline data, dispatches refresh actions, and opens chats", async () => {
    render(<OverviewLayout />);

    expect(screen.getByText("Empty Overview State")).toBeInTheDocument();

    await waitFor(() => {
      expect(getOverviewActivityMock).toHaveBeenCalledTimes(1);
    });

    expect(getConversationsMock).toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "overview/setOverviewData",
      payload: {
        timeline: [
          { id: "workspace-1", _id: "workspace-1", type: "workspace", name: "Workspace Alpha", permissions: { role: "owner" } },
        ],
      },
    });

    fireEvent.click(screen.getByText("Select Workspace Alpha"));
    expect(screen.getByText("Chat Panel:Workspace Alpha")).toBeInTheDocument();
    expect(screen.getByText("Jump:none")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Open Mention"));
    expect(screen.getByText("Jump:mention-2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Create Global Task"));
    expect(dispatchMock).toHaveBeenCalledWith({ type: "overview/setTaskPopupOpen", payload: true });
    expect(onUserStatusMock).toHaveBeenCalledTimes(1);
  });
});

