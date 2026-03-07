jest.mock("jsonwebtoken", () => ({
    verify: jest.fn()
}));

jest.mock("../../src/models/user", () => ({
    findById: jest.fn()
}));

const jwt = require("jsonwebtoken");
const User = require("../../src/models/user");
const optionalAuthMiddleware = require("../../src/middleware/optionalAuthMiddleware");

const makeUserQuery = (value) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value)
    })
});

beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_SECRET = "jwt-secret";
});

test("skips auth lookup when access token is missing", async () => {
    const req = { cookies: {} };
    const res = {};
    const next = jest.fn();

    await optionalAuthMiddleware(req, res, next);

    expect(jwt.verify).not.toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
});

test("attaches active user id when token is valid", async () => {
    jwt.verify.mockReturnValue({ id: "user-1" });
    User.findById.mockReturnValue(makeUserQuery({
        _id: "user-1",
        accountStatus: "active"
    }));

    const req = { cookies: { accessToken: "valid-token" } };
    const res = {};
    const next = jest.fn();

    await optionalAuthMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("valid-token", "jwt-secret");
    expect(User.findById).toHaveBeenCalledWith("user-1");
    expect(req.user).toEqual({ _id: "user-1" });
    expect(next).toHaveBeenCalledTimes(1);
});

test("ignores inactive or missing users without blocking access", async () => {
    jwt.verify.mockReturnValue({ id: "user-2" });
    User.findById
        .mockReturnValueOnce(makeUserQuery({
            _id: "user-2",
            accountStatus: "suspended"
        }))
        .mockReturnValueOnce(makeUserQuery(null));

    const firstReq = { cookies: { accessToken: "valid-token" } };
    const secondReq = { cookies: { accessToken: "valid-token-2" } };
    const next = jest.fn();

    await optionalAuthMiddleware(firstReq, {}, next);
    await optionalAuthMiddleware(secondReq, {}, next);

    expect(firstReq.user).toBeUndefined();
    expect(secondReq.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(2);
});

test("swallows token verification errors and proceeds anonymously", async () => {
    jwt.verify.mockImplementation(() => {
        throw new Error("bad token");
    });

    const req = { cookies: { accessToken: "bad-token" } };
    const next = jest.fn();

    await optionalAuthMiddleware(req, {}, next);

    expect(User.findById).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
});
