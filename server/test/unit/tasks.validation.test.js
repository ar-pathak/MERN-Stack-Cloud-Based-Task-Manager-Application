const {
    createTaskSchema,
    updateTaskSchema,
    addTaskAssigneesSchema,
    removeTaskAssigneesSchema,
    changeTaskStatusSchema,
    respondTaskAssigneeRequestSchema
} = require("../../src/modules/tasks/tasks.validation");

const ID_1 = "507f1f77bcf86cd799439011";
const ID_2 = "507f191e810c19729de860ea";
const ID_3 = "507f191e810c19729de860eb";

test("createTaskSchema accepts valid input and coerces dueDate", () => {
    const parsed = createTaskSchema.parse({
        title: "Ship v2",
        description: "Finalize release checklist",
        dueDate: "2030-01-01T10:00:00.000Z",
        isHighPriority: true,
        assigneesTeams: [ID_1, ID_2],
        assignees: [ID_3]
    });

    expect(parsed.title).toBe("Ship v2");
    expect(parsed.dueDate).toBeInstanceOf(Date);
    expect(parsed.assigneesTeams).toEqual([ID_1, ID_2]);
});

test("createTaskSchema rejects duplicate team ids", () => {
    expect(() => createTaskSchema.parse({
        title: "Task",
        assigneesTeams: [ID_1, ID_1]
    })).toThrow("Duplicate team IDs not allowed");
});

test("updateTaskSchema rejects empty payload", () => {
    expect(() => updateTaskSchema.parse({}))
        .toThrow("At least one field must be provided for update");
});

test("updateTaskSchema accepts partial payload", () => {
    const parsed = updateTaskSchema.parse({
        title: "Updated title"
    });

    expect(parsed).toEqual({ title: "Updated title" });
});

test("addTaskAssigneesSchema requires at least one assignee target", () => {
    expect(() => addTaskAssigneesSchema.parse({}))
        .toThrow("At least one assignee (ID or username) or team must be provided");
});

test("addTaskAssigneesSchema rejects duplicate usernames", () => {
    expect(() => addTaskAssigneesSchema.parse({
        usernames: ["alice", "alice"]
    })).toThrow("Duplicate usernames not allowed");
});

test("removeTaskAssigneesSchema rejects empty payload and accepts teams", () => {
    expect(() => removeTaskAssigneesSchema.parse({}))
        .toThrow("At least one assignee or team must be provided");

    const parsed = removeTaskAssigneesSchema.parse({
        assigneesTeams: [ID_1]
    });

    expect(parsed.assigneesTeams).toEqual([ID_1]);
});

test("changeTaskStatusSchema and respondTaskAssigneeRequestSchema enforce enums", () => {
    expect(changeTaskStatusSchema.parse({ status: "completed" }))
        .toEqual({ status: "completed" });
    expect(respondTaskAssigneeRequestSchema.parse({ action: "approve" }))
        .toEqual({ action: "approve" });

    expect(() => changeTaskStatusSchema.parse({ status: "done" })).toThrow();
    expect(() => respondTaskAssigneeRequestSchema.parse({ action: "hold" })).toThrow();
});

test("addTaskAssigneesSchema accepts unique ids and usernames", () => {
    const parsed = addTaskAssigneesSchema.parse({
        assigneesTeams: [ID_1],
        assignees: [ID_2],
        usernames: ["alice"]
    });

    expect(parsed).toEqual({
        assigneesTeams: [ID_1],
        assignees: [ID_2],
        usernames: ["alice"]
    });
});

test("removeTaskAssigneesSchema accepts unique assignees", () => {
    const parsed = removeTaskAssigneesSchema.parse({
        assignees: [ID_1, ID_2]
    });

    expect(parsed.assignees).toEqual([ID_1, ID_2]);
});
