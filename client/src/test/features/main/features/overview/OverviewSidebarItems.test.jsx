import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dispatchMock, usePermissionsMock, useAuthMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  usePermissionsMock: vi.fn(),
  useAuthMock: vi.fn(),
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
}));

vi.mock("../../../../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../../../features/main/features/overview/hook/usePermissions", () => ({
  usePermissions: (task) => usePermissionsMock(task),
}));

import SidebarHeader from "../../../../../features/main/features/overview/components/SidebarHeader";
import TaskItem from "../../../../../features/main/features/overview/components/TaskItem";
import UserChatItem from "../../../../../features/main/features/overview/components/UserChatItem";
import WorkspaceItem from "../../../../../features/main/features/overview/components/WorkspaceItem";
import TimelineItemsList from "../../../../../features/main/features/overview/components/sidebar/TimelineItemsList";

describe("overview sidebar items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { _id: "user-1", username: "riya" } });
    usePermissionsMock.mockReturnValue({ canCreateSubtask: true });
  });

  it("updates sidebar search/filter and dispatches create actions", () => {
    const setSearchQuery = vi.fn();
    const setFilterType = vi.fn();
    const { container } = render(
      <SidebarHeader
        searchQuery=""
        setSearchQuery={setSearchQuery}
        filterType="all"
        setFilterType={setFilterType}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Search conversations/i), {
      target: { value: "design" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Unread/i }));
    fireEvent.click(container.querySelectorAll("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Create Workspace/i }));
    fireEvent.click(container.querySelectorAll("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    expect(setSearchQuery).toHaveBeenCalledWith("design");
    expect(setFilterType).toHaveBeenCalledWith("unread");
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ payload: true, type: expect.stringContaining("setWorkspacePopupOpen") }),
    );
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ payload: true, type: expect.stringContaining("setTaskPopupOpen") }),
    );
  });

  it("renders task items and handles selection plus subtask creation", () => {
    const setSelectedItem = vi.fn();
    const toggleExpand = vi.fn();
    const onCreateSubtask = vi.fn();
    const task = {
      id: "task-1",
      type: "task",
      title: "Finish spec",
      unreadCount: 2,
      mentionUnreadCount: 1,
      isHighPriority: true,
      status: "active",
      lastMessage: {
        createdAt: "2026-03-18T10:00:00.000Z",
        sender: { username: "alex" },
        content: "Please review",
      },
      subtasks: [],
    };

    render(
      <TaskItem
        task={task}
        selectedItem={null}
        setSelectedItem={setSelectedItem}
        expandedItems={new Set()}
        toggleExpand={toggleExpand}
        onCreateSubtask={onCreateSubtask}
      />,
    );

    fireEvent.click(screen.getByText("Finish spec"));
    fireEvent.click(screen.getByTitle("Add Subtask"));

    expect(setSelectedItem).toHaveBeenCalledWith(task);
    expect(toggleExpand).toHaveBeenCalledWith("task-1");
    expect(onCreateSubtask).toHaveBeenCalledWith(task);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.stringContaining("setIsSubtaskPopupOpen"), payload: true }),
    );
  });

  it("renders chat mention actions and opens chats", () => {
    const setSelectedItem = vi.fn();
    const onOpenChat = vi.fn();
    const onOpenMention = vi.fn();
    const chat = {
      id: "chat-1",
      chatType: "group",
      title: "Design Review",
      unreadCount: 4,
      callInviteUnreadCount: 2,
      nextCallInviteMessageId: "message-9",
      updatedAt: "2026-03-18T10:00:00.000Z",
      lastMessage: { sender: { username: "alex" }, content: "Join the review" },
    };

    render(
      <UserChatItem
        chat={chat}
        selectedItem={null}
        setSelectedItem={setSelectedItem}
        onOpenChat={onOpenChat}
        onOpenMention={onOpenMention}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /2 call invites/i }));
    fireEvent.click(screen.getByText("Design Review"));

    expect(onOpenMention).toHaveBeenCalledWith(
      expect.objectContaining({ nextMentionMessageId: "message-9" }),
    );
    expect(setSelectedItem).toHaveBeenCalledWith(chat);
    expect(onOpenChat).toHaveBeenCalledWith(chat);
  });

  it("renders workspace trees and create actions for projects and tasks", () => {
    const handleCreate = vi.fn();
    const workspace = {
      id: "workspace-1",
      _id: "workspace-1",
      type: "workspace",
      name: "Workspace Alpha",
      permissions: { canCreateProject: true, canCreateTask: true },
      projects: [
        {
          id: "project-1",
          name: "Roadmap",
          status: "active",
          permissions: { canCreateTask: true },
          tasks: [
            {
              id: "task-2",
              type: "task",
              title: "Plan release",
              subtasks: [],
              status: "active",
            },
          ],
        },
      ],
      tasks: [],
    };

    render(
      <WorkspaceItem
        workspaceId="workspace-1"
        workspace={workspace}
        handleCreate={handleCreate}
        selectedItem={null}
        setSelectedItem={vi.fn()}
        isMobile={false}
        onOpenChat={vi.fn()}
        expandedItems={new Set(["workspace-1", "project-1"])}
        toggleExpand={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle("Add Project"));
    fireEvent.click(screen.getAllByTitle("Add Task")[0]);
    fireEvent.click(screen.getAllByTitle("Add Task")[1]);

    expect(screen.getByText("Workspace Alpha")).toBeInTheDocument();
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.getByText("Plan release")).toBeInTheDocument();
    expect(handleCreate).toHaveBeenNthCalledWith(1, workspace, "project", "workspace");
    expect(handleCreate).toHaveBeenNthCalledWith(2, workspace, "task", "workspace");
    expect(handleCreate).toHaveBeenNthCalledWith(3, workspace, "task", "project", workspace.projects[0]);
  });

  it("maps timeline item types to the correct item components", () => {
    const setSelectedItem = vi.fn();
    const onOpenChat = vi.fn();

    render(
      <TimelineItemsList
        items={[
          { id: "task-1", type: "task", title: "Task Row", subtasks: [], status: "active" },
          {
            id: "chat-1",
            type: "chat",
            chatType: "group",
            title: "Direct Chat",
            updatedAt: "2026-03-18T10:00:00.000Z",
          },
          {
            id: "workspace-2",
            type: "workspace",
            name: "Workspace Row",
            permissions: {},
            projects: [],
            tasks: [],
          },
        ]}
        selectedItem={null}
        setSelectedItem={setSelectedItem}
        onOpenChat={onOpenChat}
        expandedItems={new Set()}
        toggleExpand={vi.fn()}
        onCreateSubtask={vi.fn()}
        onOpenMention={vi.fn()}
        onWorkspaceAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Direct Chat"));

    expect(screen.getByText("Task Row")).toBeInTheDocument();
    expect(screen.getByText("Workspace Row")).toBeInTheDocument();
    expect(setSelectedItem).toHaveBeenCalledWith(expect.objectContaining({ id: "chat-1" }));
    expect(onOpenChat).toHaveBeenCalledWith(expect.objectContaining({ id: "chat-1" }));
  });
});
