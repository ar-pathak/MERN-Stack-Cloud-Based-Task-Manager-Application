const assert = require("node:assert/strict");

const { signupSchema, loginSchema } = require("../src/modules/auth/auth.validation");

test("signup schema accepts strong password and normalizes email", () => {
    const parsed = signupSchema.parse({
        name: "Aurora User",
        email: " USER@Example.com ",
        password: "Str0ng@Pass"
    });

    assert.equal(parsed.email, "user@example.com");
    assert.equal(parsed.name, "Aurora User");
});

test("signup schema rejects weak password", () => {
    assert.throws(
        () => signupSchema.parse({
            name: "Aurora User",
            email: "user@example.com",
            password: "weakpass"
        }),
        /Password must include at least one uppercase letter/
    );
});

test("login schema trims and normalizes email", () => {
    const parsed = loginSchema.parse({
        email: " Test.User@Example.com ",
        password: "any-value"
    });

    assert.equal(parsed.email, "test.user@example.com");
});
