import { beforeEach, expect, test, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
    },
}));

vi.mock("../../config/axios", () => ({
    default: apiMock,
}));

import { getOverview, getOverviewActivity } from "../../service/overview.service.js";

beforeEach(() => {
    apiMock.get.mockReset();
});

test("getOverview aggregates stats and normalizes task data", async () => {
    apiMock.get
        .mockResolvedValueOnce({
            data: {
                data: {
                    id: "ws-1",
                    members: [{ id: "m1" }, { id: "m2" }],
                },
            },
        })
        .mockResolvedValueOnce({
            data: {
                data: [{ id: "p1" }, { id: "p2" }],
            },
        })
        .mockResolvedValueOnce({
            data: {
                data: [
                    { id: "t1", status: "Done", priority: "high" },
                    { id: "t2", status: "completed", priority: "low", isHighPriority: true },
                    { id: "t3", status: "todo", priority: "low" },
                    { id: "t4" },
                ],
            },
        });

    const result = await getOverview("ws-1");

    expect(apiMock.get).toHaveBeenNthCalledWith(
        1,
        "/api/workspace/getWorkspaces/ws-1"
    );
    expect(apiMock.get).toHaveBeenNthCalledWith(
        2,
        "/api/projects/workspaces/ws-1/projects"
    );
    expect(apiMock.get).toHaveBeenNthCalledWith(
        3,
        "/api/tasks/workspaces/ws-1/tasks"
    );
    expect(result.stats).toEqual({
        projectsCount: 2,
        totalTasks: 4,
        completedTasks: 2,
        highPriorityTasks: 2,
        membersCount: 2,
    });
    expect(result.projects).toHaveLength(2);
    expect(result.tasks).toHaveLength(4);
    expect(result.workspace.id).toBe("ws-1");
});

test("getOverview handles non-array payloads and empty responses", async () => {
    apiMock.get
        .mockResolvedValueOnce({
            data: {
                id: "ws-2",
                members: "invalid",
            },
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
            data: {
                tasks: "invalid",
            },
        });

    const result = await getOverview("ws-2");

    expect(result.projects).toEqual([]);
    expect(result.tasks).toEqual([]);
    expect(result.stats).toEqual({
        projectsCount: 0,
        totalTasks: 0,
        completedTasks: 0,
        highPriorityTasks: 0,
        membersCount: 0,
    });
});

test("getOverview treats non-array projects as empty", async () => {
    apiMock.get
        .mockResolvedValueOnce({
            data: {
                data: { id: "ws-5", members: [] },
            },
        })
        .mockResolvedValueOnce({
            data: {
                data: { projects: "invalid" },
            },
        })
        .mockResolvedValueOnce({
            data: {
                data: [],
            },
        });

    const result = await getOverview("ws-5");

    expect(result.projects).toEqual([]);
    expect(result.stats.projectsCount).toBe(0);
});

test("getOverview surfaces API errors with response messaging", async () => {
    apiMock.get.mockRejectedValueOnce({
        response: {
            data: { message: "Overview failed" },
            status: 503,
        },
    });

    await expect(getOverview("ws-3")).rejects.toEqual({
        message: "Overview failed",
        status: 503,
    });
});

test("getOverview falls back to default error messaging", async () => {
    apiMock.get.mockRejectedValueOnce(new Error("network down"));

    await expect(getOverview("ws-4")).rejects.toEqual({
        message: "Failed to fetch overview data",
        status: 500,
    });
});

test("getOverviewActivity normalizes identifiers and names", async () => {
    apiMock.get
        .mockResolvedValueOnce({
            data: {
                data: [
                    { _id: "a1", title: "Alpha", type: "note", updatedAt: "now" },
                    { id: "a2", name: "Beta", type: "task", updatedAt: "later" },
                ],
            },
        })
        .mockResolvedValueOnce({
            data: [
                { _id: "a3", title: "Gamma", type: "chat", updatedAt: "soon" },
            ],
        })
        .mockResolvedValueOnce({});

    const first = await getOverviewActivity();
    const second = await getOverviewActivity();
    const third = await getOverviewActivity();

    expect(first).toEqual([
        { _id: "a1", title: "Alpha", type: "note", updatedAt: "now", id: "a1", name: "Alpha" },
        { id: "a2", name: "Beta", type: "task", updatedAt: "later" },
    ]);
    expect(second).toEqual([
        { _id: "a3", title: "Gamma", type: "chat", updatedAt: "soon", id: "a3", name: "Gamma" },
    ]);
    expect(third).toEqual([]);
});
