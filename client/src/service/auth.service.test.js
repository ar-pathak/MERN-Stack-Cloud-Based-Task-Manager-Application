import { beforeEach, expect, test, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        post: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("../config/axios", () => ({
    default: apiMock,
}));

import {
    forgotPassword,
    getStoredUser,
    getUserInfo,
    login,
    logout,
    refreshToken,
    register,
    resetPassword,
    verifyEmail,
} from "./auth.service.js";

beforeEach(() => {
    localStorage.clear();
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

test("register stores returned user data in localStorage", async () => {
    apiMock.post.mockResolvedValue({
        data: {
            success: true,
            data: {
                user: {
                    id: "user-1",
                    email: "aurora@example.com",
                },
            },
        },
    });

    const result = await register({
        name: "Aurora",
        email: "aurora@example.com",
        password: "Str0ng@Pass1",
    });

    expect(apiMock.post).toHaveBeenCalledWith("/api/auth/signup", {
        name: "Aurora",
        email: "aurora@example.com",
        password: "Str0ng@Pass1",
    });
    expect(result.success).toBe(true);
    expect(JSON.parse(localStorage.getItem("user"))).toEqual({
        id: "user-1",
        email: "aurora@example.com",
    });
});

test("login stores the normalized response user payload", async () => {
    apiMock.post.mockResolvedValue({
        data: {
            success: true,
            data: {
                user: {
                    id: "user-2",
                    name: "Aurora User",
                },
            },
        },
    });

    const result = await login({
        email: "aurora@example.com",
        password: "Str0ng@Pass1",
    });

    expect(apiMock.post).toHaveBeenCalledWith("/api/auth/login", {
        email: "aurora@example.com",
        password: "Str0ng@Pass1",
    });
    expect(result.success).toBe(true);
    expect(JSON.parse(localStorage.getItem("user"))).toEqual({
        id: "user-2",
        name: "Aurora User",
    });
});

test("logout clears local state and returns success even when API fails", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "user-3" }));
    apiMock.post.mockRejectedValue(new Error("network"));

    await expect(logout()).resolves.toEqual({
        success: true,
        message: "Logged out successfully",
    });

    expect(apiMock.post).toHaveBeenCalledWith("/api/auth/logout");
    expect(localStorage.getItem("user")).toBeNull();
});

test("forgotPassword accepts either a string or an object payload", async () => {
    apiMock.post.mockResolvedValue({ data: { success: true } });

    await forgotPassword("aurora@example.com");
    await forgotPassword({ email: "aurora@example.com" });

    expect(apiMock.post).toHaveBeenNthCalledWith(1, "/api/auth/forgot-password", {
        email: "aurora@example.com",
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(2, "/api/auth/forgot-password", {
        email: "aurora@example.com",
    });
});

test("resetPassword and verifyEmail post the expected payloads", async () => {
    apiMock.post.mockResolvedValue({ data: { success: true } });

    await resetPassword({ token: "reset-token", password: "Str0ng@Pass1" });
    await verifyEmail("verify-token");

    expect(apiMock.post).toHaveBeenNthCalledWith(
        1,
        "/api/auth/reset-password/reset-token",
        { password: "Str0ng@Pass1" }
    );
    expect(apiMock.post).toHaveBeenNthCalledWith(2, "/api/auth/verify-email", {
        token: "verify-token",
    });
});

test("getUserInfo and refreshToken normalize service errors and clear session data", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "user-4" }));
    apiMock.get.mockRejectedValue({
        response: {
            data: { message: "Unauthorized" },
            status: 401,
        },
    });
    apiMock.post.mockRejectedValue({
        response: {
            data: { message: "Refresh expired" },
            status: 403,
        },
    });

    await expect(getUserInfo()).rejects.toEqual({
        message: "Unauthorized",
        status: 401,
    });

    await expect(refreshToken()).rejects.toEqual({
        message: "Refresh expired",
        status: 403,
    });
    expect(localStorage.getItem("user")).toBeNull();
});

test("getStoredUser returns the parsed local user", () => {
    localStorage.setItem("user", JSON.stringify({ id: "user-5", name: "Aurora" }));

    expect(getStoredUser()).toEqual({ id: "user-5", name: "Aurora" });
});
