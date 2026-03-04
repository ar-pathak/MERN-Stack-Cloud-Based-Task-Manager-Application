jest.mock("../../src/models/adminAccount", () => ({
    findById: jest.fn()
}));

jest.mock("../../src/helpers/adminTokenHelper", () => ({
    verifyAdminAccessToken: jest.fn()
}));

const AdminAccount = require("../../src/models/adminAccount");
const { verifyAdminAccessToken } = require("../../src/helpers/adminTokenHelper");
const { ADMIN_ACCESS_COOKIE_NAME } = require("../../src/helpers/adminCookieHelper");
const adminAuthMiddleware = require("../../src/middleware/adminAuthMiddleware");

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
    jest.clearAllMocks();
});

test("returns 401 when admin token cookie is missing", async () => {
    const req = { cookies: {} };
    const res = createResponse();
    const next = jest.fn();

    await adminAuthMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "Admin authentication required",
        code: "ADMIN_AUTH_REQUIRED"
    });
    expect(next).not.toHaveBeenCalled();
});

test("returns 401 when token is expired", async () => {
    verifyAdminAccessToken.mockImplementation(() => {
        const error = new Error("expired");
        error.name = "TokenExpiredError";
        throw error;
    });

    const req = {
        cookies: {
            [ADMIN_ACCESS_COOKIE_NAME]: "expired-token"
        }
    };
    const res = createResponse();
    const next = jest.fn();

    await adminAuthMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "Admin session expired",
        code: "ADMIN_SESSION_EXPIRED"
    });
});

test("returns 401 when token signature is invalid", async () => {
    verifyAdminAccessToken.mockImplementation(() => {
        throw new Error("invalid signature");
    });

    const req = {
        cookies: {
            [ADMIN_ACCESS_COOKIE_NAME]: "invalid-token"
        }
    };
    const res = createResponse();
    const next = jest.fn();

    await adminAuthMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "Invalid admin session token",
        code: "ADMIN_TOKEN_INVALID"
    });
    expect(next).not.toHaveBeenCalled();
});

test("returns 401 when token payload is missing id/scope", async () => {
    verifyAdminAccessToken.mockReturnValue({ id: "admin-1", scope: "user" });

    const req = {
        cookies: {
            [ADMIN_ACCESS_COOKIE_NAME]: "bad-payload-token"
        }
    };
    const res = createResponse();
    const next = jest.fn();

    await adminAuthMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "Invalid admin token payload",
        code: "ADMIN_TOKEN_PAYLOAD_INVALID"
    });
});

test("returns 401 when admin account is not found", async () => {
    verifyAdminAccessToken.mockReturnValue({ id: "admin-1", scope: "admin" });
    AdminAccount.findById.mockResolvedValue(null);

    const req = {
        cookies: {
            [ADMIN_ACCESS_COOKIE_NAME]: "valid-token"
        }
    };
    const res = createResponse();
    const next = jest.fn();

    await adminAuthMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "Admin account not found",
        code: "ADMIN_NOT_FOUND"
    });
});

test("returns 403 when admin account is inactive", async () => {
    verifyAdminAccessToken.mockReturnValue({ id: "admin-1", scope: "admin" });
    AdminAccount.findById.mockResolvedValue({
        _id: "admin-1",
        accountStatus: "suspended",
        emailVerified: true
    });

    const req = {
        cookies: {
            [ADMIN_ACCESS_COOKIE_NAME]: "valid-token"
        }
    };
    const res = createResponse();
    const next = jest.fn();

    await adminAuthMiddleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
        success: false,
        message: "Admin account is not active",
        code: "ADMIN_INACTIVE"
    });
});

test("returns 403 when admin email is not verified", async () => {
    verifyAdminAccessToken.mockReturnValue({ id: "admin-1", scope: "admin" });
    AdminAccount.findById.mockResolvedValue({
        _id: "admin-1",
        accountStatus: "active",
        emailVerified: false
    });

    const req = {
        cookies: {
            [ADMIN_ACCESS_COOKIE_NAME]: "valid-token"
        }
    };
    const res = createResponse();
    const next = jest.fn();

    await adminAuthMiddleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
        success: false,
        message: "Admin email is not verified",
        code: "ADMIN_EMAIL_NOT_VERIFIED"
    });
});

test("attaches req.admin and calls next for valid active admin", async () => {
    const adminDoc = {
        _id: "admin-1",
        accountStatus: "active",
        emailVerified: true
    };
    verifyAdminAccessToken.mockReturnValue({ id: "admin-1", scope: "admin" });
    AdminAccount.findById.mockResolvedValue(adminDoc);

    const req = {
        cookies: {
            [ADMIN_ACCESS_COOKIE_NAME]: "valid-token"
        }
    };
    const res = createResponse();
    const next = jest.fn();

    await adminAuthMiddleware(req, res, next);

    expect(req.admin).toBe(adminDoc);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
});

test("returns ADMIN_AUTH_FAILED when unexpected exception bubbles up", async () => {
    verifyAdminAccessToken.mockReturnValue({ id: "admin-1", scope: "admin" });
    AdminAccount.findById.mockRejectedValue(new Error("db unavailable"));

    const req = {
        cookies: {
            [ADMIN_ACCESS_COOKIE_NAME]: "valid-token"
        }
    };
    const res = createResponse();
    const next = jest.fn();

    await adminAuthMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "Admin authentication failed",
        code: "ADMIN_AUTH_FAILED",
        error: "db unavailable"
    });
    expect(next).not.toHaveBeenCalled();
});
