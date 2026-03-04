jest.mock("jsonwebtoken", () => ({
    sign: jest.fn(),
    verify: jest.fn()
}));

const jwt = require("jsonwebtoken");
const {
    generateAdminAccessToken,
    verifyAdminAccessToken
} = require("../../src/helpers/adminTokenHelper");

const ORIGINAL_ENV = process.env;

beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
    process.env = ORIGINAL_ENV;
});

test("generateAdminAccessToken signs token using ADMIN_JWT_SECRET", () => {
    process.env.ADMIN_JWT_SECRET = "admin-secret";
    jwt.sign.mockReturnValue("signed-admin-token");

    const token = generateAdminAccessToken("admin-1");

    expect(token).toBe("signed-admin-token");
    expect(jwt.sign).toHaveBeenCalledWith(
        { id: "admin-1", scope: "admin" },
        "admin-secret",
        { expiresIn: "12h" }
    );
});

test("generateAdminAccessToken falls back to JWT_SECRET", () => {
    delete process.env.ADMIN_JWT_SECRET;
    process.env.JWT_SECRET = "shared-secret";
    jwt.sign.mockReturnValue("signed-with-shared-secret");

    const token = generateAdminAccessToken(42);

    expect(token).toBe("signed-with-shared-secret");
    expect(jwt.sign).toHaveBeenCalledWith(
        { id: "42", scope: "admin" },
        "shared-secret",
        { expiresIn: "12h" }
    );
});

test("generateAdminAccessToken throws when no admin secret is configured", () => {
    delete process.env.ADMIN_JWT_SECRET;
    delete process.env.JWT_SECRET;

    expect(() => generateAdminAccessToken("admin-1"))
        .toThrow("Missing ADMIN_JWT_SECRET (or JWT_SECRET) for admin auth");
});

test("verifyAdminAccessToken verifies using resolved admin secret", () => {
    process.env.ADMIN_JWT_SECRET = "admin-secret";
    jwt.verify.mockReturnValue({ id: "admin-1", scope: "admin" });

    const decoded = verifyAdminAccessToken("admin-token");

    expect(decoded).toEqual({ id: "admin-1", scope: "admin" });
    expect(jwt.verify).toHaveBeenCalledWith("admin-token", "admin-secret");
});

test("verifyAdminAccessToken throws when no admin secret is configured", () => {
    delete process.env.ADMIN_JWT_SECRET;
    delete process.env.JWT_SECRET;

    expect(() => verifyAdminAccessToken("token"))
        .toThrow("Missing ADMIN_JWT_SECRET (or JWT_SECRET) for admin auth");
});
