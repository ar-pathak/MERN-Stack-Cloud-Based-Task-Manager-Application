import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import EmptyState from "../../../../../features/main/features/overview/components/EmptyState";
import EmptyTimelineState from "../../../../../features/main/features/overview/components/sidebar/EmptyTimelineState";
import NoResultsState from "../../../../../features/main/features/overview/components/sidebar/NoResultsState";
import TimelineSkeleton from "../../../../../features/main/features/overview/components/sidebar/TimelineSkeleton";
import { mockData, mockMessages } from "../../../../../features/main/features/overview/utils/data";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, ...props }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("overview primitives", () => {
  it("renders the overview empty state", () => {
    render(<EmptyState />);

    expect(screen.getByText("Start a focused conversation")).toBeInTheDocument();
    expect(
      screen.getByText(/Select a workspace, project, task, or subtask/i),
    ).toBeInTheDocument();
    expect(screen.getByText("3 team members online")).toBeInTheDocument();
  });

  it("renders the empty timeline actions and calls both handlers", () => {
    const onCreateWorkspace = vi.fn();
    const onCreateTask = vi.fn();

    render(
      <EmptyTimelineState
        onCreateWorkspace={onCreateWorkspace}
        onCreateTask={onCreateTask}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Create Workspace/i }));
    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    expect(screen.getByText("There is no activity")).toBeInTheDocument();
    expect(onCreateWorkspace).toHaveBeenCalledTimes(1);
    expect(onCreateTask).toHaveBeenCalledTimes(1);
  });

  it("renders no-results copy for search and filter states", () => {
    const { rerender } = render(<NoResultsState searchQuery="design" />);
    expect(screen.getByText("Try changing your search query")).toBeInTheDocument();

    rerender(<NoResultsState searchQuery="" />);
    expect(screen.getByText("Try changing your filter")).toBeInTheDocument();
  });

  it("renders the timeline skeleton structure", () => {
    const { container } = render(<TimelineSkeleton />);

    expect(container.querySelectorAll('[class*="bg-slate-800/30"]')).toHaveLength(5);
    expect(container.querySelectorAll('[class*="ml-8"]')).toHaveLength(2);
  });

  it("exports the overview mock data and messages", () => {
    expect(mockData.workspaces).toHaveLength(2);
    expect(mockData.workspaces[0]).toMatchObject({
      id: "ws-1",
      name: "Product Development",
      pinned: true,
      unreadCount: 3,
    });
    expect(typeof mockData.workspaces[0].icon).toBe("object");
    expect(mockData.workspaces[0].projects[0].tasks).toHaveLength(3);

    expect(mockMessages["ws-1"]).toHaveLength(4);
    expect(mockMessages["proj-1"][0]).toMatchObject({
      sender: "Mike Ross",
      type: "text",
    });
  });
});

