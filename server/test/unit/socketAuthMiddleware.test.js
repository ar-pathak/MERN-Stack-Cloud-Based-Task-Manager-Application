jest.mock("jsonwebtoken", () => ({
    verify: jest.fn()
}));

jest.mock("cookie", () => ({
    parse: jest.fn()
}));

const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const socketAuthMiddleware = require("../../src/middleware/socketAuthMiddleware");

beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "jwt-secret";
});

test("authenticates socket using access token from cookie header", () => {
    cookie.parse.mockReturnValue({
        accessToken: "cookie-token"
    });
    jwt.verify.mockReturnValue({
        userId: "user-1"
    });

    const socket = {
        request: {
            headers: {
                cookie: "accessToken=cookie-token"
            }
        },
        handshake: {
            auth: {}
        }
    };
    const next = jest.fn();

    socketAuthMiddleware(socket, next);

    expect(cookie.parse).toHaveBeenCalledWith("accessToken=cookie-token");
    expect(jwt.verify).toHaveBeenCalledWith("cookie-token", "jwt-secret");
    expect(socket.userId).toBe("user-1");
    expect(next).toHaveBeenCalledWith();
});

test("falls back to handshake auth token when cookie is absent", () => {
    jwt.verify.mockReturnValue({
        id: "user-2"
    });

    const socket = {
        request: {
            headers: {}
        },
        handshake: {
            auth: {
                token: "handshake-token"
            }
        }
    };
    const next = jest.fn();

    socketAuthMiddleware(socket, next);

    expect(cookie.parse).not.toHaveBeenCalled();
    expect(jwt.verify).toHaveBeenCalledWith("handshake-token", "jwt-secret");
    expect(socket.userId).toBe("user-2");
    expect(next).toHaveBeenCalledWith();
});

test("returns authentication error when token is not found", () => {
    const socket = {
        request: {
            headers: {}
        },
        handshake: {
            auth: {}
        }
    };
    const next = jest.fn();

    socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain("Authentication error: Token not found");
});

test("returns authentication error when token payload is invalid", () => {
    jwt.verify.mockReturnValue({});

    const socket = {
        request: {
            headers: {
                cookie: "accessToken=token"
            }
        },
        handshake: {
            auth: {}
        }
    };
    const next = jest.fn();

    socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Invalid token payload");
});

test("returns unauthorized error when jwt verification throws", () => {
    cookie.parse.mockReturnValue({
        accessToken: "bad-token"
    });
    jwt.verify.mockImplementation(() => {
        throw new Error("jwt malformed");
    });

    const socket = {
        request: {
            headers: {
                cookie: "accessToken=bad-token"
            }
        },
        handshake: {
            auth: {}
        }
    };
    const next = jest.fn();

    socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Unauthorized: jwt malformed");
});
