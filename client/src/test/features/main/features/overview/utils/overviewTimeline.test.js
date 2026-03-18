import { expect, test, vi } from "vitest";

import {
    applySidebarActivityUpdate,
    applyUnreadUpdate,
    filterTimelineItems,
    getProjectOptions,
    getWorkspaceOptions,
    normalizeOverviewNode,
} from "../../../../../../features/main/features/overview/utils/overviewTimeline.js";

test("normalizeOverviewNode builds workspace, project, and task structures", () => {
    const input = {
        type: "workspace",
        _id: "workspace-1",
        name: "Aurora Workspace",
        projects: [
            {
                type: "project",
                id: "project-1",
                name: "Launch Plan",
                tasks: [
                    {
                        type: "task",
                        _id: "task-1",
                        title: "Draft outline",
                        subtasks: [
                            {
                                _id: "subtask-1",
                                title: "Collect notes",
                            },
                        ],
                    },
                ],
            },
        ],
        tasks: [],
    };

    const normalized = normalizeOverviewNode(input);

    expect(normalized.id).toBe("workspace-1");
    expect(normalized.hasChildren).toBe(true);
    expect(normalized.projects[0].id).toBe("project-1");
    expect(normalized.projects[0].hasChildren).toBe(true);
    expect(normalized.projects[0].tasks[0].id).toBe("task-1");
    expect(normalized.projects[0].tasks[0].subtasks[0]).toMatchObject({
        id: "subtask-1",
        type: "subtask",
    });
});

test("applySidebarActivityUpdate updates the message and moves the chat to the front", () => {
    vi.spyOn(Date, "now").mockReturnValue(1710000000000);

    const timeline = [
        { id: "chat-1", type: "chat", latestActivity: 100 },
        { id: "chat-2", type: "chat", latestActivity: 200 },
    ];

    const updated = applySidebarActivityUpdate(timeline, "chat-2", {
        body: "New note",
    });

    expect(updated[0].id).toBe("chat-2");
    expect(updated[0].lastMessage).toEqual({ body: "New note" });
    expect(updated[0].latestActivity).toBe(1710000000000);
    expect(updated[1].id).toBe("chat-1");
});

test("applyUnreadUpdate increments and resets nested unread counts", () => {
    const timeline = [
        {
            id: "workspace-1",
            type: "workspace",
            projects: [
                { id: "project-1", type: "project", unreadCount: 1, tasks: [] },
            ],
        },
    ];

    const incremented = applyUnreadUpdate(timeline, {
        chatId: "project-1",
        incrementBy: 2,
    });

    expect(incremented[0].projects[0].unreadCount).toBe(3);

    const reset = applyUnreadUpdate(incremented, {
        chatId: "project-1",
        reset: true,
    });

    expect(reset[0].projects[0].unreadCount).toBe(0);
});

test("filterTimelineItems respects search, unread, and starred filters", () => {
    const items = [
        {
            id: "workspace-1",
            type: "workspace",
            name: "Alpha",
            unreadCount: 0,
            hasChildUnread: true,
            starred: true,
        },
        {
            id: "workspace-2",
            type: "workspace",
            name: "Beta",
            unreadCount: 0,
            hasChildUnread: false,
        },
    ];

    expect(filterTimelineItems(items, "alp", "")).toHaveLength(1);
    expect(filterTimelineItems(items, "", "unread")[0].id).toBe("workspace-1");
    expect(filterTimelineItems(items, "", "starred")[0].id).toBe("workspace-1");
});

test("workspace and project options are derived from the timeline", () => {
    const timeline = [
        {
            id: "workspace-1",
            type: "workspace",
            name: "Aurora",
            projects: [
                { id: "project-1", name: "Atlas" },
                { id: "project-2", name: "Nova" },
            ],
        },
        { id: "chat-1", type: "chat", name: "General" },
    ];

    expect(getWorkspaceOptions(timeline)).toEqual([
        { id: "workspace-1", name: "Aurora", workspace: "workspace-1" },
    ]);
    expect(getProjectOptions(timeline)).toEqual([
        { id: "project-1", name: "Atlas", workspace: "workspace-1" },
        { id: "project-2", name: "Nova", workspace: "workspace-1" },
    ]);
});
