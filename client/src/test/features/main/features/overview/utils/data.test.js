import { expect, test } from "vitest";

import {
    mockData,
    mockMessages,
} from "../../../../../../features/main/features/overview/utils/data.js";

test("overview mock data includes workspace, project, and task structures", () => {
    expect(Array.isArray(mockData.workspaces)).toBe(true);
    expect(mockData.workspaces.length).toBeGreaterThan(0);

    const firstWorkspace = mockData.workspaces[0];
    expect(firstWorkspace).toMatchObject({
        id: "ws-1",
        type: "workspace",
        pinned: true,
    });
    expect(firstWorkspace.icon).toBeTruthy();

    const firstProject = firstWorkspace.projects[0];
    expect(firstProject).toMatchObject({
        id: "proj-1",
        type: "project",
        status: "active",
    });
    expect(firstProject.icon).toBeTruthy();

    const firstTask = firstProject.tasks[0];
    expect(firstTask).toMatchObject({
        id: "task-1",
        type: "task",
        status: "completed",
    });
});

test("overview mock messages include threaded activity and attachments", () => {
    expect(mockMessages["ws-1"]).toHaveLength(4);
    expect(mockMessages["proj-1"]).toHaveLength(2);

    const attachmentMessage = mockMessages["ws-1"][2];
    expect(attachmentMessage).toMatchObject({
        sender: "Mike Ross",
        type: "text",
    });
    expect(attachmentMessage.attachment).toMatchObject({
        name: "wireframes_v2.fig",
        type: "file",
    });
});

