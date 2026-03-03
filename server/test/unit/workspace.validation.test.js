const {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    updateMemberRoleSchema,
    sendInviteSchema,
    addMemberSchema,
    transferOwnershipSchema,
    respondInviteSchema
} = require("../../src/modules/workspace/workspace.validation");

const VALID_ID = "507f1f77bcf86cd799439011";

test("createWorkspaceSchema trims name and description", () => {
    const parsed = createWorkspaceSchema.parse({
        name: "  Engineering Hub  ",
        description: "  Shared workspace for engineering updates  "
    });

    expect(parsed).toEqual({
        name: "Engineering Hub",
        description: "Shared workspace for engineering updates"
    });
});

test("updateWorkspaceSchema requires at least one field", () => {
    expect(() => updateWorkspaceSchema.parse({}))
        .toThrow("At least one field (name or description) must be provided");
});

test("updateMemberRoleSchema enforces allowed roles", () => {
    expect(updateMemberRoleSchema.parse({ role: "viewer" }))
        .toEqual({ role: "viewer" });

    expect(() => updateMemberRoleSchema.parse({ role: "manager" })).toThrow();
});

test("addMemberSchema normalizes email and applies default role", () => {
    const parsed = addMemberSchema.parse({
        email: "USER@Example.com"
    });

    expect(parsed).toEqual({
        email: "user@example.com",
        role: "member"
    });
});

test("addMemberSchema requires userId, email, or username", () => {
    expect(() => addMemberSchema.parse({ role: "admin" }))
        .toThrow("Must provide either userId, email, or username to add a member");

    expect(addMemberSchema.parse({ userId: VALID_ID, role: "viewer" }).userId).toBe(VALID_ID);
});

test("sendInviteSchema defaults role and validates email", () => {
    expect(sendInviteSchema.parse({})).toEqual({ role: "member" });

    expect(() => sendInviteSchema.parse({ email: "not-an-email" })).toThrow("Invalid email address");
});

test("transferOwnershipSchema validates newOwnerId format", () => {
    expect(transferOwnershipSchema.parse({ newOwnerId: VALID_ID }))
        .toEqual({ newOwnerId: VALID_ID });
    expect(() => transferOwnershipSchema.parse({ newOwnerId: "bad-id" }))
        .toThrow("Invalid user ID format");
});

test("respondInviteSchema accepts only accept or reject", () => {
    expect(respondInviteSchema.parse({ action: "accept" }))
        .toEqual({ action: "accept" });
    expect(() => respondInviteSchema.parse({ action: "maybe" })).toThrow();
});
