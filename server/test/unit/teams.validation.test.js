const {
    createTeamSchema,
    updateTeamSchema,
    addTeamMemberSchema,
    updateTeamMemberRoleSchema
} = require("../../src/modules/team/teams.validation");

const VALID_ID = "507f1f77bcf86cd799439011";

test("createTeamSchema validates required name and optional description", () => {
    const parsed = createTeamSchema.parse({
        name: "Core Platform",
        description: "Handles authentication and session flows"
    });

    expect(parsed.name).toBe("Core Platform");
});

test("updateTeamSchema allows partial updates", () => {
    const parsed = updateTeamSchema.parse({
        description: "Updated description"
    });

    expect(parsed).toEqual({ description: "Updated description" });
});

test("addTeamMemberSchema validates object id and role enum", () => {
    expect(addTeamMemberSchema.parse({
        memberId: VALID_ID,
        role: "member"
    })).toEqual({
        memberId: VALID_ID,
        role: "member"
    });

    expect(() => addTeamMemberSchema.parse({
        memberId: VALID_ID,
        role: "owner"
    })).toThrow();
});

test("updateTeamMemberRoleSchema allows lead or member only", () => {
    expect(updateTeamMemberRoleSchema.parse({ role: "lead" }))
        .toEqual({ role: "lead" });
    expect(() => updateTeamMemberRoleSchema.parse({ role: "admin" })).toThrow();
});
