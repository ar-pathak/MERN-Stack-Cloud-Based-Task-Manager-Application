const {
    createProjectSchema,
    updateProjectSchema,
    addProjectTeamsSchema,
    removeProjectTeamsSchema,
    addProjectMembersSchema,
    removeProjectMembersSchema,
    updateProjectMemberRoleSchema,
    requestProjectStatusChangeSchema,
    respondProjectStatusChangeRequestSchema
} = require("../../src/modules/projects/project.validation");

const ID_1 = "507f1f77bcf86cd799439011";
const ID_2 = "507f191e810c19729de860ea";

test("createProjectSchema applies defaults and allows optional collections", () => {
    const parsed = createProjectSchema.parse({
        name: "Website Revamp"
    });

    expect(parsed.status).toBe("active");
    expect(parsed.name).toBe("Website Revamp");
});

test("createProjectSchema rejects duplicate team ids", () => {
    expect(() => createProjectSchema.parse({
        name: "Project",
        teams: [ID_1, ID_1]
    })).toThrow("Duplicate team IDs not allowed");
});

test("updateProjectSchema accepts dueDate coercion and optional status", () => {
    const parsed = updateProjectSchema.parse({
        dueDate: "2030-03-04T00:00:00.000Z",
        status: "archived"
    });

    expect(parsed.dueDate).toBeInstanceOf(Date);
    expect(parsed.status).toBe("archived");
});

test("addProjectTeamsSchema enforces non-empty unique ids", () => {
    expect(addProjectTeamsSchema.parse({ teams: [ID_1, ID_2] }).teams).toEqual([ID_1, ID_2]);

    expect(() => addProjectTeamsSchema.parse({ teams: [] }))
        .toThrow("At least one team is required");
    expect(() => addProjectTeamsSchema.parse({ teams: [ID_1, ID_1] }))
        .toThrow("Duplicate team IDs not allowed");
});

test("member and role related schemas validate shape", () => {
    expect(addProjectMembersSchema.parse({
        members: [{ user: ID_1, role: "admin" }]
    }).members).toHaveLength(1);

    expect(removeProjectMembersSchema.parse({
        users: [ID_1]
    }).users).toEqual([ID_1]);

    expect(removeProjectTeamsSchema.parse({
        teams: [ID_1]
    }).teams).toEqual([ID_1]);

    expect(() => updateProjectMemberRoleSchema.parse({ role: "owner" })).toThrow();
});

test("status change schemas enforce allowed action and note limits", () => {
    expect(requestProjectStatusChangeSchema.parse({
        status: "completed",
        note: "Ready for archive"
    }).status).toBe("completed");

    expect(respondProjectStatusChangeRequestSchema.parse({
        action: "approve"
    }).action).toBe("approve");

    expect(() => respondProjectStatusChangeRequestSchema.parse({ action: "skip" })).toThrow();
    expect(() => requestProjectStatusChangeSchema.parse({
        status: "active",
        note: "a".repeat(501)
    })).toThrow("Note cannot exceed 500 characters");
});
