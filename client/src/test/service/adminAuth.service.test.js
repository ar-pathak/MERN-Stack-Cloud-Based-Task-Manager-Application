import { beforeEach, expect, test, vi } from "vitest";

const { adminApiMock } = vi.hoisted(() => ({
    adminApiMock: {
        post: vi.fn(),
        get: vi.fn(),
    },
}));

vi.mock("../../config/adminAxios", () => ({
    default: adminApiMock,
}));

import {
    forgotAdminPassword,
    getAdminMe,
    loginAdmin,
    logoutAdmin,
    registerAdmin,
    requestAdminVerification,
    resetAdminPassword,
    sendAdminVerificationEmail,
    verifyAdminEmail,
    verifyAdminLoginOtp,
} from "../../service/adminAuth.service.js";

beforeEach(() => {
    adminApiMock.post.mockReset();
    adminApiMock.get.mockReset();
});

const runPostCase = async ({ fn, args, expectedArgs, first, second }) => {
    adminApiMock.post
        .mockResolvedValueOnce({ data: { data: first } })
        .mockResolvedValueOnce({ data: second })
        .mockResolvedValueOnce({});

    const firstResult = await fn(...args);
    const secondResult = await fn(...args);
    const thirdResult = await fn(...args);

    expect(firstResult).toEqual(first);
    expect(secondResult).toEqual(second);
    expect(thirdResult).toBeNull();
    expect(adminApiMock.post).toHaveBeenNthCalledWith(1, ...expectedArgs);
    expect(adminApiMock.post).toHaveBeenNthCalledWith(2, ...expectedArgs);
    expect(adminApiMock.post).toHaveBeenNthCalledWith(3, ...expectedArgs);

    adminApiMock.post.mockReset();
};

test("admin auth endpoints return data.data and response.data payloads", async () => {
    await runPostCase({
        fn: registerAdmin,
        args: [{ email: "admin@example.com" }],
        expectedArgs: ["/api/admin/auth/register", { email: "admin@example.com" }],
        first: { id: "admin-1" },
        second: { id: "admin-2" },
    });

    await runPostCase({
        fn: loginAdmin,
        args: [{ email: "admin@example.com", password: "Pass1!" }],
        expectedArgs: ["/api/admin/auth/login", { email: "admin@example.com", password: "Pass1!" }],
        first: { token: "t1" },
        second: { token: "t2" },
    });

    await runPostCase({
        fn: verifyAdminLoginOtp,
        args: [{ otp: "123456" }],
        expectedArgs: ["/api/admin/auth/verify-login-otp", { otp: "123456" }],
        first: { verified: true },
        second: { verified: false },
    });

    await runPostCase({
        fn: logoutAdmin,
        args: [],
        expectedArgs: ["/api/admin/auth/logout"],
        first: { success: true },
        second: { success: false },
    });

    await runPostCase({
        fn: forgotAdminPassword,
        args: ["admin@example.com"],
        expectedArgs: ["/api/admin/auth/forgot-password", { email: "admin@example.com" }],
        first: { sent: true },
        second: { sent: false },
    });

    await runPostCase({
        fn: requestAdminVerification,
        args: ["admin@example.com"],
        expectedArgs: ["/api/admin/auth/request-verification", { email: "admin@example.com" }],
        first: { sent: true },
        second: { sent: false },
    });

    await runPostCase({
        fn: resetAdminPassword,
        args: [{ token: "reset-1", password: "NewPass1!" }],
        expectedArgs: ["/api/admin/auth/reset-password/reset-1", { password: "NewPass1!" }],
        first: { reset: true },
        second: { reset: false },
    });

    await runPostCase({
        fn: sendAdminVerificationEmail,
        args: [],
        expectedArgs: ["/api/admin/auth/send-verification"],
        first: { sent: true },
        second: { sent: false },
    });

    await runPostCase({
        fn: verifyAdminEmail,
        args: ["verify-1"],
        expectedArgs: ["/api/admin/auth/verify-email", { token: "verify-1" }],
        first: { verified: true },
        second: { verified: false },
    });

    adminApiMock.get
        .mockResolvedValueOnce({ data: { data: { id: "admin-9" } } })
        .mockResolvedValueOnce({ data: { id: "admin-10" } })
        .mockResolvedValueOnce({});

    const firstProfile = await getAdminMe();
    const secondProfile = await getAdminMe();
    const thirdProfile = await getAdminMe();

    expect(firstProfile).toEqual({ id: "admin-9" });
    expect(secondProfile).toEqual({ id: "admin-10" });
    expect(thirdProfile).toBeNull();
    expect(adminApiMock.get).toHaveBeenNthCalledWith(1, "/api/admin/auth/me");
    expect(adminApiMock.get).toHaveBeenNthCalledWith(2, "/api/admin/auth/me");
    expect(adminApiMock.get).toHaveBeenNthCalledWith(3, "/api/admin/auth/me");
});

test("admin auth errors surface response payloads", async () => {
    const error = {
        response: {
            data: { message: "Admin blocked", errors: ["blocked"], code: "ADM_401" },
            status: 401,
        },
    };

    adminApiMock.post
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);

    adminApiMock.get.mockRejectedValueOnce(error);

    await expect(registerAdmin({ email: "bad@example.com" })).rejects.toEqual({
        message: "Admin blocked",
        errors: ["blocked"],
        status: 401,
        code: "ADM_401",
    });
    await expect(loginAdmin({ email: "bad@example.com" })).rejects.toEqual({
        message: "Admin blocked",
        errors: ["blocked"],
        status: 401,
        code: "ADM_401",
    });
    await expect(verifyAdminLoginOtp({ otp: "bad" })).rejects.toEqual({
        message: "Admin blocked",
        errors: ["blocked"],
        status: 401,
        code: "ADM_401",
    });
    await expect(forgotAdminPassword("bad@example.com")).rejects.toEqual({
        message: "Admin blocked",
        errors: ["blocked"],
        status: 401,
        code: "ADM_401",
    });
    await expect(requestAdminVerification("bad@example.com")).rejects.toEqual({
        message: "Admin blocked",
        errors: ["blocked"],
        status: 401,
        code: "ADM_401",
    });
    await expect(resetAdminPassword({ token: "bad", password: "bad" })).rejects.toEqual({
        message: "Admin blocked",
        errors: ["blocked"],
        status: 401,
        code: "ADM_401",
    });
    await expect(sendAdminVerificationEmail()).rejects.toEqual({
        message: "Admin blocked",
        errors: ["blocked"],
        status: 401,
        code: "ADM_401",
    });
    await expect(verifyAdminEmail("bad")).rejects.toEqual({
        message: "Admin blocked",
        errors: ["blocked"],
        status: 401,
        code: "ADM_401",
    });
    await expect(getAdminMe()).rejects.toEqual({
        message: "Admin blocked",
        errors: ["blocked"],
        status: 401,
        code: "ADM_401",
    });
});

test("admin auth errors fall back to error.message and default messaging", async () => {
    adminApiMock.post.mockRejectedValueOnce({ message: "Network down" });
    await expect(loginAdmin({ email: "down@example.com" })).rejects.toEqual({
        message: "Network down",
        errors: [],
        status: undefined,
        code: undefined,
    });

    adminApiMock.post.mockRejectedValueOnce({});
    await expect(verifyAdminEmail("missing")).rejects.toEqual({
        message: "Admin email verification failed",
        errors: [],
        status: undefined,
        code: undefined,
    });
});

test("logoutAdmin returns null when the API call fails", async () => {
    adminApiMock.post.mockRejectedValueOnce(new Error("fail"));

    await expect(logoutAdmin()).resolves.toBeNull();
});
