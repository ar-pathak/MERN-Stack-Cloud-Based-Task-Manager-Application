jest.mock("jsonwebtoken", () => ({
    verify: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn()
}));

const jwt = require("jsonwebtoken");
const User = require("../../src/models/user");
const authMiddleware = require("../../src/middleware/authMiddleware");

const createResponse = () => {
    const res = {
        statusCode: 200,
        body: null
    };
    res.status = jest.fn((statusCode) => {
        res.statusCode = statusCode;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    return res;
};

beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_SECRET = "jwt-secret";
});

test("returns 401 when access token cookie is missing", async () => {
    const req = { cookies: {} };
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "Authentication required. No token provided."
    });
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
});

test("returns TOKEN_EXPIRED when jwt verification fails for expired token", async () => {
    jwt.verify.mockImplementation(() => {
        const error = new Error("expired");
        error.name = "TokenExpiredError";
        throw error;
    });

    const req = { cookies: { accessToken: "expired-token" } };
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("expired-token", "jwt-secret");
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "Token expired. Please refresh your session.",
        code: "TOKEN_EXPIRED"
    });
});

test("returns TOKEN_INVALID when jwt verification fails for invalid token", async () => {
    jwt.verify.mockImplementation(() => {
        const error = new Error("invalid");
        error.name = "JsonWebTokenError";
        throw error;
    });

    const req = { cookies: { accessToken: "invalid-token" } };
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "Invalid token",
        code: "TOKEN_INVALID"
    });
    expect(next).not.toHaveBeenCalled();
});

test("returns 401 when authenticated user no longer exists", async () => {
    jwt.verify.mockReturnValue({ id: "user-404" });
    User.findById.mockResolvedValue(null);

    const req = { cookies: { accessToken: "valid-token" } };
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(User.findById).toHaveBeenCalledWith("user-404");
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "User not found"
    });
    expect(next).not.toHaveBeenCalled();
});

test("returns 403 when authenticated user is inactive", async () => {
    jwt.verify.mockReturnValue({ id: "user-2" });
    User.findById.mockResolvedValue({
        _id: "user-2",
        accountStatus: "suspended"
    });

    const req = { cookies: { accessToken: "valid-token" } };
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
        success: false,
        message: "Account is not active",
        code: "ACCOUNT_INACTIVE"
    });
    expect(next).not.toHaveBeenCalled();
});

test("attaches active user to request and calls next", async () => {
    const userDoc = {
        _id: "user-1",
        accountStatus: "active"
    };
    jwt.verify.mockReturnValue({ id: "user-1" });
    User.findById.mockResolvedValue(userDoc);

    const req = { cookies: { accessToken: "valid-token" } };
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toBe(userDoc);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
});

test("returns AUTHENTICATION_FAILED when user lookup throws unexpectedly", async () => {
    jwt.verify.mockReturnValue({ id: "user-1" });
    User.findById.mockRejectedValue(new Error("db down"));

    const req = { cookies: { accessToken: "valid-token" } };
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "Authentication failed",
        error: "db down"
    });
    expect(next).not.toHaveBeenCalled();
});
