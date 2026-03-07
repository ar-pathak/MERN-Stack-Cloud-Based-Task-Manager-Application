const AdminAccount = require("../../src/models/adminAccount");

test("applies defaults and returns sanitized admin payload", () => {
    const admin = new AdminAccount({
        name: "Support Owner",
        email: "OWNER@EXAMPLE.COM",
        passwordHash: "x".repeat(60)
    });
    admin.emailVerified = true;
    admin.lastLoginAt = new Date("2026-03-01T00:00:00.000Z");
    admin.lastSeenAt = new Date("2026-03-02T00:00:00.000Z");
    admin.createdAt = new Date("2026-01-01T00:00:00.000Z");
    admin.updatedAt = new Date("2026-03-03T00:00:00.000Z");
    admin.resetPasswordToken = "secret-reset-token";

    expect(AdminAccount.ADMIN_ROLES).toEqual([
        "owner",
        "support_manager",
        "support_agent",
        "viewer"
    ]);
    expect(admin.role).toBe("support_agent");
    expect(admin.accountStatus).toBe("active");
    expect(admin.email).toBe("owner@example.com");

    expect(admin.toSafeJSON()).toEqual({
        _id: admin._id,
        name: "Support Owner",
        email: "owner@example.com",
        role: "support_agent",
        accountStatus: "active",
        emailVerified: true,
        lastLoginAt: admin.lastLoginAt,
        lastSeenAt: admin.lastSeenAt,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
    });
});
