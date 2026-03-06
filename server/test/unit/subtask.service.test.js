jest.mock("../../src/models/subtasks", () => ({
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    updateOne: jest.fn(),
    aggregate: jest.fn(),
    bulkWrite: jest.fn()
}));

jest.mock("../../src/models/tasks", () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/workspace", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/models/chat", () => ({
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

jest.mock("../../src/models/message", () => ({
    deleteMany: jest.fn()
}));

jest.mock("../../src/modules/utils/activityLogger", () => ({
    logActivity: jest.fn(),
    getUserLabel: jest.fn(),
    getUserLabels: jest.fn(),
    formatUserList: jest.fn((labels) => labels.join(", "))
}));

jest.mock("../../src/modules/utils/chatMembershipSync", () => ({
    getTeamMemberIds: jest.fn()
}));

const mongoose = require("mongoose");
const Subtask = require("../../src/models/subtasks");
const Task = require("../../src/models/tasks");
const Project = require("../../src/models/project");
const Workspace = require("../../src/models/workspace");
const Chat = require("../../src/models/chat");
const Message = require("../../src/models/message");
const { logActivity, getUserLabel, getUserLabels } = require("../../src/modules/utils/activityLogger");
const { getTeamMemberIds } = require("../../src/modules/utils/chatMembershipSync");
const subtaskService = require("../../src/modules/subtask/subtask.service");

const makeSubtaskListQuery = (value) => ({
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value)
});

const makeTaskContextQuery = (value) => ({
    select: jest.fn().mockReturnValue((() => {
        const query = {
            lean: jest.fn().mockResolvedValue(value),
            session: jest.fn().mockReturnThis()
        };
        return query;
    })())
});

const createSession = () => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn()
});

beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

test("createSubtask throws when parent task is missing", async () => {
    Task.findById.mockResolvedValue(null);

    await expect(subtaskService.createSubtask({
        taskId: "task-1",
        title: "Subtask",
        createdBy: "user-1"
    })).rejects.toThrow("Task not found");
});

test("getSubtasksByTask returns populated list in order", async () => {
    Subtask.find.mockReturnValue(makeSubtaskListQuery([{ _id: "subtask-1" }]));

    const result = await subtaskService.getSubtasksByTask("task-1");

    expect(Subtask.find).toHaveBeenCalledWith({ task: "task-1" });
    expect(result).toEqual([{ _id: "subtask-1" }]);
});

test("getSubtaskById throws when not found", async () => {
    Subtask.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null)
    });

    await expect(subtaskService.getSubtaskById("subtask-404"))
        .rejects
        .toThrow("Subtask not found");
});

test("getSubtaskById returns populated subtask when available", async () => {
    const query = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: "subtask-1", title: "Subtask A" })
    };
    Subtask.findById.mockReturnValue(query);

    const result = await subtaskService.getSubtaskById("subtask-1");

    expect(query.populate).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ _id: "subtask-1", title: "Subtask A" });
});

test("updateSubtask throws when subtask does not exist", async () => {
    Subtask.findById.mockResolvedValue(null);

    await expect(subtaskService.updateSubtask("subtask-1", { title: "Updated" }, "user-1"))
        .rejects
        .toThrow("Subtask not found");
});

test("toggleSubtask toggles completion and logs activity", async () => {
    const subtaskDoc = {
        _id: "subtask-1",
        title: "Subtask A",
        completed: false,
        task: "task-1",
        chatId: "chat-1",
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
    };
    Subtask.findById.mockResolvedValue(subtaskDoc);
    Task.findById.mockReturnValue(makeTaskContextQuery({
        _id: "task-1",
        title: "Task A",
        workspace: "workspace-1",
        project: null,
        chatId: "task-chat-1"
    }));
    Workspace.findById.mockReturnValue(makeTaskContextQuery({
        _id: "workspace-1",
        name: "WS",
        chatId: "workspace-chat-1"
    }));
    Task.findByIdAndUpdate.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Actor");
    logActivity.mockResolvedValue({});

    const result = await subtaskService.toggleSubtask("subtask-1", "user-1");

    expect(result.completed).toBe(true);
    expect(subtaskDoc.save).toHaveBeenCalledTimes(1);
    expect(Task.findByIdAndUpdate).toHaveBeenCalledWith("task-1", {
        $set: { updatedAt: expect.any(Date) }
    });
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "subtask.completed",
        subtaskId: "subtask-1"
    }));
});

test("toggleSubtask reopens completed item and clears completion metadata", async () => {
    const subtaskDoc = {
        _id: "subtask-1",
        title: "Subtask A",
        completed: true,
        completedAt: new Date(),
        completedBy: "user-2",
        task: "task-1",
        chatId: "chat-1",
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
    };
    Subtask.findById.mockResolvedValue(subtaskDoc);
    Task.findById.mockReturnValue(makeTaskContextQuery({
        _id: "task-1",
        title: "Task A",
        workspace: null,
        project: null,
        chatId: "task-chat-1"
    }));
    Task.findByIdAndUpdate.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Actor");
    logActivity.mockResolvedValue({});

    const result = await subtaskService.toggleSubtask("subtask-1", "user-1");

    expect(result.completed).toBe(false);
    expect(result.completedAt).toBeUndefined();
    expect(result.completedBy).toBeUndefined();
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "subtask.reopened"
    }));
});

test("deleteSubtask throws when missing", async () => {
    Subtask.findById.mockResolvedValue(null);

    await expect(subtaskService.deleteSubtask("subtask-1", "user-1"))
        .rejects
        .toThrow("Subtask not found");
});

test("deleteSubtask removes subtask chat/messages and reorders remaining subtasks", async () => {
    const session = createSession();
    jest.spyOn(mongoose, "startSession").mockResolvedValue(session);
    const subtaskDoc = {
        _id: "subtask-1",
        title: "Subtask A",
        task: "task-1",
        createdBy: "user-1",
        chatId: "chat-1",
        deleteOne: jest.fn().mockResolvedValue({})
    };
    Subtask.findById.mockResolvedValue(subtaskDoc);
    Task.findById.mockReturnValue(makeTaskContextQuery({
        _id: "task-1",
        title: "Task A",
        workspace: "workspace-1",
        project: null,
        chatId: "task-chat-1"
    }));
    Project.findById.mockReturnValue(makeTaskContextQuery(null));
    Workspace.findById.mockReturnValue(makeTaskContextQuery({
        _id: "workspace-1",
        name: "WS",
        chatId: "workspace-chat-1"
    }));
    getUserLabel.mockResolvedValue("Actor");
    logActivity.mockResolvedValue({});
    Chat.findByIdAndDelete.mockResolvedValue({});
    Chat.findByIdAndUpdate.mockResolvedValue({});
    Task.findByIdAndUpdate.mockResolvedValue({});
    Subtask.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
    });
    Subtask.bulkWrite.mockResolvedValue({});

    const result = await subtaskService.deleteSubtask("subtask-1", "user-1");

    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(subtaskDoc.deleteOne).toHaveBeenCalledWith({ session });
    expect(Task.findByIdAndUpdate).toHaveBeenCalledWith("task-1", {
        $set: { updatedAt: expect.any(Date) }
    });
    expect(result).toEqual({ message: "Subtask deleted successfully" });
});

test("deleteSubtask aborts transaction if cleanup fails", async () => {
    const session = createSession();
    jest.spyOn(mongoose, "startSession").mockResolvedValue(session);
    const subtaskDoc = {
        _id: "subtask-1",
        title: "Subtask A",
        task: "task-1",
        createdBy: "user-1",
        chatId: "chat-1",
        deleteOne: jest.fn().mockResolvedValue({})
    };
    Subtask.findById.mockResolvedValue(subtaskDoc);
    Task.findById.mockReturnValue(makeTaskContextQuery({
        _id: "task-1",
        title: "Task A",
        workspace: null,
        project: null,
        chatId: "task-chat-1"
    }));
    getUserLabel.mockResolvedValue("Actor");
    logActivity.mockRejectedValue(new Error("log failed"));

    await expect(subtaskService.deleteSubtask("subtask-1", "user-1"))
        .rejects
        .toThrow("log failed");

    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
});

test("reorderSubtasksManual validates all subtasks belong to task", async () => {
    Subtask.find.mockResolvedValue([{ _id: "s1" }]);

    await expect(subtaskService.reorderSubtasksManual("task-1", ["s1", "s2"]))
        .rejects
        .toThrow("Some subtasks do not belong to this task");
});

test("reorderSubtasks skips bulk write when there are no subtasks", async () => {
    Subtask.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
    });

    await subtaskService.reorderSubtasks("task-1");

    expect(Subtask.bulkWrite).not.toHaveBeenCalled();
});

test("reorderSubtasks writes sequential order updates", async () => {
    Subtask.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ _id: "s1" }, { _id: "s2" }])
    });
    Subtask.bulkWrite.mockResolvedValue({});

    await subtaskService.reorderSubtasks("task-1");

    expect(Subtask.bulkWrite).toHaveBeenCalledWith([
        { updateOne: { filter: { _id: "s1" }, update: { order: 0 } } },
        { updateOne: { filter: { _id: "s2" }, update: { order: 1 } } }
    ]);
});

test("reorderSubtasksManual updates order and returns refreshed list", async () => {
    Subtask.find.mockResolvedValue([{ _id: "s1" }, { _id: "s2" }]);
    Subtask.bulkWrite.mockResolvedValue({});
    jest.spyOn(subtaskService, "getSubtasksByTask").mockResolvedValue([{ _id: "s2" }, { _id: "s1" }]);

    const result = await subtaskService.reorderSubtasksManual("task-1", ["s2", "s1"]);

    expect(Subtask.bulkWrite).toHaveBeenCalledWith([
        { updateOne: { filter: { _id: "s2" }, update: { order: 0 } } },
        { updateOne: { filter: { _id: "s1" }, update: { order: 1 } } }
    ]);
    expect(result).toEqual([{ _id: "s2" }, { _id: "s1" }]);
});

test("getSubtaskStats returns default for empty and computes completion rate", async () => {
    const taskId = "507f1f77bcf86cd799439011";
    Subtask.aggregate.mockResolvedValueOnce([]);

    await expect(subtaskService.getSubtaskStats(taskId)).resolves.toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        completionRate: 0
    });

    Subtask.aggregate.mockResolvedValueOnce([{
        total: 5,
        completed: 3,
        pending: 2
    }]);

    await expect(subtaskService.getSubtaskStats(taskId)).resolves.toEqual({
        total: 5,
        completed: 3,
        pending: 2,
        completionRate: 60
    });
});

test("updateSubtask renames, completes, and syncs chat members", async () => {
    const subtaskDoc = {
        _id: "subtask-1",
        title: "Old Title",
        completed: false,
        task: "task-1",
        chatId: "chat-1",
        createdBy: "creator-1",
        assignedTo: ["user-2"],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
    };

    Subtask.findById.mockResolvedValue(subtaskDoc);
    Task.findById
        .mockReturnValueOnce({
            select: jest.fn().mockResolvedValue({
                createdBy: "creator-1",
                assignees: ["user-2", "user-3"],
                assigneesTeams: []
            })
        })
        .mockReturnValueOnce(makeTaskContextQuery({
            _id: "task-1",
            title: "Task A",
            workspace: null,
            project: null,
            chatId: "task-chat-1"
        }));

    Task.findByIdAndUpdate.mockResolvedValue({});
    Chat.findByIdAndUpdate.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Actor");
    logActivity.mockResolvedValue({});

    const updated = await subtaskService.updateSubtask(
        "subtask-1",
        { title: "New Title", completed: true, assignedTo: ["user-2", "user-3", "user-3"] },
        "actor-1"
    );

    expect(updated.title).toBe("New Title");
    expect(updated.completed).toBe(true);
    expect(updated.assignedTo).toEqual(["user-2", "user-3"]);
    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("chat-1", { name: "New Title" });
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "subtask.renamed"
    }));
});

test("updateSubtask logs completion action when only completion changes", async () => {
    const subtaskDoc = {
        _id: "subtask-1",
        title: "Subtask A",
        completed: false,
        task: "task-1",
        chatId: "chat-1",
        createdBy: "creator-1",
        assignedTo: ["user-2"],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
    };

    Subtask.findById.mockResolvedValue(subtaskDoc);
    Task.findById.mockReturnValue(makeTaskContextQuery({
        _id: "task-1",
        title: "Task A",
        workspace: null,
        project: null,
        chatId: "task-chat-1"
    }));
    Task.findByIdAndUpdate.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Actor");
    logActivity.mockResolvedValue({});

    await subtaskService.updateSubtask("subtask-1", { completed: true }, "actor-1");

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "subtask.completed"
    }));
});

test("addAssignees validates input and updates chat membership", async () => {
    Subtask.findById.mockResolvedValue({
        _id: "subtask-1",
        title: "Subtask A",
        task: "task-1",
        chatId: "chat-1",
        createdBy: "actor-1"
    });
    Task.findById
        .mockReturnValueOnce({
            select: jest.fn().mockResolvedValue({
                createdBy: "actor-1",
                assignees: ["user-2", "user-3"],
                assigneesTeams: []
            })
        })
        .mockReturnValueOnce(makeTaskContextQuery({
            _id: "task-1",
            title: "Task A",
            workspace: null,
            project: null,
            chatId: "task-chat-1"
        }));
    Subtask.updateOne.mockResolvedValue({});
    Chat.findByIdAndUpdate.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Actor");
    getUserLabels.mockResolvedValue(["User Two"]);
    logActivity.mockResolvedValue({});
    jest.spyOn(subtaskService, "getSubtaskById").mockResolvedValue({ _id: "subtask-1", assignedTo: ["user-2"] });

    const result = await subtaskService.addAssignees("subtask-1", ["user-2", "user-2"], "actor-1");

    expect(Subtask.updateOne).toHaveBeenCalledWith(
        { _id: "subtask-1" },
        { $addToSet: { assignedTo: { $each: ["user-2"] } } }
    );
    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("chat-1", {
        $addToSet: { members: { $each: ["user-2"] } }
    });
    expect(result).toEqual({ _id: "subtask-1", assignedTo: ["user-2"] });
});

test("addAssignees rejects empty input and users not assigned to parent task", async () => {
    Subtask.findById.mockResolvedValue({
        _id: "subtask-1",
        task: "task-1",
        createdBy: "actor-1"
    });

    await expect(subtaskService.addAssignees("subtask-1", [], "actor-1"))
        .rejects
        .toThrow("At least one assignee is required");

    Task.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
            createdBy: "actor-1",
            assignees: ["user-2"],
            assigneesTeams: []
        })
    });

    await expect(subtaskService.addAssignees("subtask-1", ["user-99"], "actor-1"))
        .rejects
        .toThrow("Subtask assignees must already be assigned to the parent task");
});

test("removeAssignees updates assignment and skips chat update when no chat exists", async () => {
    Subtask.findById.mockResolvedValue({
        _id: "subtask-1",
        title: "Subtask A",
        task: "task-1",
        chatId: null,
        createdBy: "actor-1"
    });
    Task.findById.mockReturnValue(makeTaskContextQuery({
        _id: "task-1",
        title: "Task A",
        workspace: null,
        project: null,
        chatId: "task-chat-1"
    }));
    Subtask.updateOne.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Actor");
    getUserLabels.mockResolvedValue(["User Two"]);
    logActivity.mockResolvedValue({});
    jest.spyOn(subtaskService, "getSubtaskById").mockResolvedValue({ _id: "subtask-1", assignedTo: [] });

    const result = await subtaskService.removeAssignees("subtask-1", ["user-2"], "actor-1");

    expect(Subtask.updateOne).toHaveBeenCalledWith(
        { _id: "subtask-1" },
        { $pull: { assignedTo: { $in: ["user-2"] } } }
    );
    expect(Chat.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({ _id: "subtask-1", assignedTo: [] });
});

test("leaveSubtask validates assignment and removes member from chat", async () => {
    Subtask.findById.mockResolvedValueOnce(null);
    await expect(subtaskService.leaveSubtask("subtask-1", "user-1"))
        .rejects
        .toThrow("Subtask not found");

    Subtask.findById.mockResolvedValueOnce({
        _id: "subtask-1",
        assignedTo: ["user-2"]
    });
    await expect(subtaskService.leaveSubtask("subtask-1", "user-1"))
        .rejects
        .toThrow("You are not assigned to this subtask");

    const subtaskDoc = {
        _id: "subtask-1",
        title: "Subtask A",
        task: "task-1",
        chatId: "chat-1",
        assignedTo: ["user-1", "user-2"]
    };
    Subtask.findById.mockResolvedValueOnce(subtaskDoc);
    Task.findById.mockReturnValue(makeTaskContextQuery({
        _id: "task-1",
        title: "Task A",
        workspace: "workspace-1",
        project: null,
        chatId: "task-chat-1"
    }));
    Project.findById.mockReturnValue(makeTaskContextQuery(null));
    Workspace.findById.mockReturnValue(makeTaskContextQuery(null));
    getUserLabel.mockResolvedValue("Actor");
    logActivity.mockResolvedValue({});
    Subtask.updateOne.mockResolvedValue({});
    Chat.findByIdAndUpdate.mockResolvedValue({});

    const result = await subtaskService.leaveSubtask("subtask-1", "user-1");

    expect(Subtask.updateOne).toHaveBeenCalledWith(
        { _id: "subtask-1" },
        { $pull: { assignedTo: "user-1" } }
    );
    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("chat-1", {
        $pull: { members: "user-1" }
    });
    expect(result).toEqual({ message: "You have left the subtask successfully" });
});

test("toggleSubtask throws when subtask does not exist", async () => {
    Subtask.findById.mockResolvedValue(null);

    await expect(subtaskService.toggleSubtask("missing-subtask", "user-1"))
        .rejects
        .toThrow("Subtask not found");
});

test("updateSubtask logs reopened action when completion changes from true to false", async () => {
    const subtaskDoc = {
        _id: "subtask-2",
        title: "Subtask B",
        completed: true,
        completedAt: new Date(),
        completedBy: "user-2",
        task: "task-2",
        chatId: "chat-2",
        createdBy: "creator-2",
        assignedTo: ["user-2"],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
    };

    Subtask.findById.mockResolvedValue(subtaskDoc);
    Task.findById.mockReturnValue(makeTaskContextQuery({
        _id: "task-2",
        title: "Task B",
        workspace: null,
        project: null,
        chatId: "task-chat-2"
    }));
    Task.findByIdAndUpdate.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Actor");
    logActivity.mockResolvedValue({});

    await subtaskService.updateSubtask("subtask-2", { completed: false }, "actor-2");

    expect(subtaskDoc.completed).toBe(false);
    expect(subtaskDoc.completedAt).toBeUndefined();
    expect(subtaskDoc.completedBy).toBeUndefined();
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "subtask.reopened"
    }));
});

test("updateSubtask skips assignment validation when parent task cannot be loaded", async () => {
    const subtaskDoc = {
        _id: "subtask-3",
        title: "Subtask C",
        completed: false,
        task: "task-3",
        chatId: null,
        createdBy: "creator-3",
        assignedTo: ["user-2"],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
    };

    Subtask.findById.mockResolvedValue(subtaskDoc);
    Task.findById
        .mockReturnValueOnce({
            select: jest.fn().mockResolvedValue(null)
        })
        .mockReturnValueOnce(makeTaskContextQuery(null));
    Task.findByIdAndUpdate.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Actor");
    logActivity.mockResolvedValue({});

    const result = await subtaskService.updateSubtask(
        "subtask-3",
        { assignedTo: ["user-2"] },
        "actor-3"
    );

    expect(result).toBe(subtaskDoc);
    expect(Chat.findByIdAndUpdate).not.toHaveBeenCalled();
});

test("updateSubtask merges assignees with team members when team assignments exist", async () => {
    const subtaskDoc = {
        _id: "subtask-4",
        title: "Subtask D",
        completed: false,
        task: "task-4",
        chatId: "chat-4",
        createdBy: "creator-4",
        assignedTo: ["user-2"],
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
    };

    Subtask.findById.mockResolvedValue(subtaskDoc);
    Task.findById
        .mockReturnValueOnce({
            select: jest.fn().mockResolvedValue({
                createdBy: "creator-4",
                assignees: ["user-2"],
                assigneesTeams: ["team-1"]
            })
        })
        .mockReturnValueOnce(makeTaskContextQuery({
            _id: "task-4",
            title: "Task D",
            workspace: null,
            project: null,
            chatId: "task-chat-4"
        }));
    getTeamMemberIds.mockResolvedValue(["team-user-1"]);
    Task.findByIdAndUpdate.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Actor");
    logActivity.mockResolvedValue({});

    await subtaskService.updateSubtask(
        "subtask-4",
        { assignedTo: ["team-user-1"] },
        "actor-4"
    );

    expect(getTeamMemberIds).toHaveBeenCalledWith(["team-1"]);
    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("chat-4", {
        members: ["creator-4", "team-user-1"]
    });
});

test("addAssignees throws when subtask does not exist", async () => {
    Subtask.findById.mockResolvedValue(null);

    await expect(subtaskService.addAssignees("subtask-missing", ["user-2"], "actor-1"))
        .rejects
        .toThrow("Subtask not found");
});

test("addAssignees treats undefined assignee list as invalid input", async () => {
    Subtask.findById.mockResolvedValue({
        _id: "subtask-5",
        task: "task-5",
        chatId: null,
        createdBy: "creator-5"
    });

    await expect(subtaskService.addAssignees("subtask-5", undefined, "actor-5"))
        .rejects
        .toThrow("At least one assignee is required");
});

test("addAssignees allows missing parent task and uses fallback actor id when omitted", async () => {
    Subtask.findById.mockResolvedValue({
        _id: "subtask-6",
        title: "Subtask F",
        task: "task-6",
        chatId: null,
        createdBy: "creator-6"
    });
    Task.findById
        .mockReturnValueOnce({
            select: jest.fn().mockResolvedValue(null)
        })
        .mockReturnValueOnce(makeTaskContextQuery(null));
    Subtask.updateOne.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Creator");
    getUserLabels.mockResolvedValue(["User Two"]);
    logActivity.mockResolvedValue({});
    jest.spyOn(subtaskService, "getSubtaskById").mockResolvedValue({ _id: "subtask-6" });

    const result = await subtaskService.addAssignees("subtask-6", ["user-2"]);

    expect(Subtask.updateOne).toHaveBeenCalledWith(
        { _id: "subtask-6" },
        { $addToSet: { assignedTo: { $each: ["user-2"] } } }
    );
    expect(Chat.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        actorId: "creator-6"
    }));
    expect(result).toEqual({ _id: "subtask-6" });
});

test("removeAssignees throws when subtask does not exist", async () => {
    Subtask.findById.mockResolvedValue(null);

    await expect(subtaskService.removeAssignees("subtask-missing", ["user-2"], "actor-1"))
        .rejects
        .toThrow("Subtask not found");
});

test("removeAssignees rejects undefined assignee list", async () => {
    Subtask.findById.mockResolvedValue({
        _id: "subtask-7",
        task: "task-7",
        chatId: null,
        createdBy: "creator-7"
    });

    await expect(subtaskService.removeAssignees("subtask-7"))
        .rejects
        .toThrow("At least one assignee is required");
});

test("removeAssignees updates chat members and uses fallback actor when omitted", async () => {
    Subtask.findById.mockResolvedValue({
        _id: "subtask-8",
        title: "Subtask H",
        task: "task-8",
        chatId: "chat-8",
        createdBy: "creator-8"
    });
    Task.findById.mockReturnValue(makeTaskContextQuery(null));
    Subtask.updateOne.mockResolvedValue({});
    Chat.findByIdAndUpdate.mockResolvedValue({});
    getUserLabel.mockResolvedValue("Creator");
    getUserLabels.mockResolvedValue(["User Two"]);
    logActivity.mockResolvedValue({});
    jest.spyOn(subtaskService, "getSubtaskById").mockResolvedValue({ _id: "subtask-8" });

    const result = await subtaskService.removeAssignees("subtask-8", ["user-2"]);

    expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith("chat-8", {
        $pull: { members: { $in: ["user-2"] } }
    });
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        actorId: "creator-8"
    }));
    expect(result).toEqual({ _id: "subtask-8" });
});

test("getSubtaskStats returns zero completion rate when grouped total is zero", async () => {
    const taskId = "507f1f77bcf86cd799439011";
    Subtask.aggregate.mockResolvedValueOnce([{
        total: 0,
        completed: 0,
        pending: 0
    }]);

    await expect(subtaskService.getSubtaskStats(taskId)).resolves.toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        completionRate: 0
    });
});

test("leaveSubtask succeeds without chat membership update when subtask has no chat", async () => {
    const subtaskDoc = {
        _id: "subtask-9",
        title: "Subtask I",
        task: "task-9",
        chatId: null,
        assignedTo: ["user-9"]
    };
    Subtask.findById.mockResolvedValue(subtaskDoc);
    Task.findById.mockReturnValue(makeTaskContextQuery(null));
    getUserLabel.mockResolvedValue("Actor");
    logActivity.mockResolvedValue({});
    Subtask.updateOne.mockResolvedValue({});

    const result = await subtaskService.leaveSubtask("subtask-9", "user-9");

    expect(Subtask.updateOne).toHaveBeenCalledWith(
        { _id: "subtask-9" },
        { $pull: { assignedTo: "user-9" } }
    );
    expect(Chat.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({ message: "You have left the subtask successfully" });
});

test("deleteSubtask uses creator fallback when actor id is omitted and skips chat deletion", async () => {
    const session = createSession();
    jest.spyOn(mongoose, "startSession").mockResolvedValue(session);
    const subtaskDoc = {
        _id: "subtask-10",
        title: "Subtask J",
        task: "task-10",
        createdBy: "creator-10",
        chatId: null,
        deleteOne: jest.fn().mockResolvedValue({})
    };
    Subtask.findById.mockResolvedValue(subtaskDoc);
    Task.findById
        .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "task-10",
                    workspace: null,
                    project: "project-10",
                    chatId: null
                }),
                session: jest.fn().mockReturnThis()
            })
        })
        .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "task-10",
                    workspace: null,
                    project: "project-10",
                    chatId: null
                }),
                session: jest.fn().mockReturnThis()
            })
        });
    Project.findById
        .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "project-10",
                    chatId: "project-chat-10",
                    workspace: "workspace-10"
                }),
                session: jest.fn().mockReturnThis()
            })
        })
        .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "project-10",
                    chatId: "project-chat-10",
                    workspace: "workspace-10"
                }),
                session: jest.fn().mockReturnThis()
            })
        });
    Workspace.findById
        .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "workspace-10",
                    chatId: "workspace-chat-10"
                }),
                session: jest.fn().mockReturnThis()
            })
        })
        .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "workspace-10",
                    chatId: "workspace-chat-10"
                }),
                session: jest.fn().mockReturnThis()
            })
        });
    getUserLabel.mockResolvedValue("Creator");
    logActivity.mockResolvedValue({});
    Task.findByIdAndUpdate.mockResolvedValue({});
    Subtask.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
    });

    const result = await subtaskService.deleteSubtask("subtask-10");

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        actorId: "creator-10",
        chatId: "project-chat-10"
    }));
    expect(Message.deleteMany).not.toHaveBeenCalled();
    expect(Chat.findByIdAndDelete).not.toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ message: "Subtask deleted successfully" });
});
