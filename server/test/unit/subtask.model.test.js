const mongoose = require("mongoose");
const Subtask = require("../../src/models/subtasks");

const newId = () => new mongoose.Types.ObjectId();

const createSubtask = (overrides = {}) => new Subtask({
    task: newId(),
    title: "Write tests",
    ...overrides
});

const getSubtaskPreSaveHook = () => {
    const hooks = Subtask.schema.s.hooks._pres.get("save") || [];
    const custom = hooks.find((entry) => {
        const fnSource = String(entry.fn);
        return fnSource.includes("this.completed")
            && fnSource.includes("this.completedAt");
    });

    return (custom || hooks[3]).fn;
};

afterEach(() => {
    jest.restoreAllMocks();
});

test("pre-save completion hook sets completedAt when task is completed first time", async () => {
    const hook = getSubtaskPreSaveHook();
    const doc = createSubtask({ completed: true, completedAt: undefined });

    await hook.call(doc);

    expect(doc.completedAt).toBeInstanceOf(Date);
});

test("pre-save completion hook keeps completedAt when already set and clears on reopen", async () => {
    const hook = getSubtaskPreSaveHook();
    const completedAt = new Date("2026-02-01T00:00:00.000Z");

    const done = createSubtask({ completed: true, completedAt });
    await hook.call(done);
    expect(done.completedAt).toEqual(completedAt);

    const reopened = createSubtask({ completed: false, completedAt });
    await hook.call(reopened);
    expect(reopened.completedAt).toBeUndefined();
});

test("isOverdue returns false for missing dates or completed subtasks", () => {
    const withoutDueDate = createSubtask({ dueDate: null, completed: false });
    expect(withoutDueDate.isOverdue()).toBe(false);

    const completed = createSubtask({
        completed: true,
        dueDate: new Date(Date.now() - 60_000)
    });
    expect(completed.isOverdue()).toBe(false);
});

test("isOverdue returns true only for incomplete subtasks past due date", () => {
    const overdue = createSubtask({
        completed: false,
        dueDate: new Date(Date.now() - 60_000)
    });
    expect(overdue.isOverdue()).toBe(true);

    const upcoming = createSubtask({
        completed: false,
        dueDate: new Date(Date.now() + 60_000)
    });
    expect(upcoming.isOverdue()).toBe(false);
});

test("getCompletionRate returns 0 for empty aggregate results", async () => {
    const aggregateSpy = jest.spyOn(Subtask, "aggregate").mockResolvedValue([]);

    const taskId = String(newId());
    const rate = await Subtask.getCompletionRate(taskId);

    expect(rate).toBe(0);
    expect(aggregateSpy).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
            $match: expect.objectContaining({
                task: expect.any(mongoose.Types.ObjectId)
            })
        })
    ]));
});

test("getCompletionRate returns rounded percentage for partial completion", async () => {
    jest.spyOn(Subtask, "aggregate").mockResolvedValue([
        {
            total: 3,
            completed: 2
        }
    ]);

    const rate = await Subtask.getCompletionRate(String(newId()));

    expect(rate).toBe(67);
});
