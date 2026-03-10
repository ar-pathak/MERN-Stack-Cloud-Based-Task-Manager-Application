import { beforeEach, expect, test, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        post: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("../../config/axios", () => ({
    default: apiMock,
}));

import {
    changePassword,
    checkAuth,
    deleteAccount,
    disable2FA,
    enable2FA,
    forgotPassword,
    getActiveSessions,
    getStoredUser,
    getUserInfo,
    getUserPreferences,
    login,
    logout,
    logoutAllDevices,
    refreshToken,
    register,
    revokeSession,
    resetPassword,
    sendVerificationEmail,
    updateProfile,
    updateUserPreferences,
    verify2FA,
    verify2FALogin,
    verifyEmail,
} from "../../service/auth.service.js";

beforeEach(() => {
    localStorage.clear();
    Object.values(apiMock).forEach((mockFn) => mockFn.mockReset());
});

const makeError = (data = {}, status = 500) => ({
    response: {
        data,
        status,
    },
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

test("logout returns the API response on success", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "user-3" }));
    apiMock.post.mockResolvedValue({ data: { success: true, message: "Logged out" } });

    const result = await logout();

    expect(apiMock.post).toHaveBeenCalledWith("/api/auth/logout");
    expect(result).toEqual({ success: true, message: "Logged out" });
    expect(localStorage.getItem("user")).toBeNull();
});

test("logout falls back to success when local storage removal fails", async () => {
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem")
        .mockImplementationOnce(() => {
            throw new Error("storage failure");
        })
        .mockImplementation(() => {});

    const result = await logout();

    expect(result).toEqual({
        success: true,
        message: "Logged out successfully",
    });
    expect(apiMock.post).not.toHaveBeenCalled();

    removeSpy.mockRestore();
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

test("getUserInfo returns the API response on success", async () => {
    apiMock.get.mockResolvedValue({ data: { user: { id: "user-12" } } });

    const result = await getUserInfo();

    expect(apiMock.get).toHaveBeenCalledWith("/api/user/me");
    expect(result).toEqual({ user: { id: "user-12" } });
});

test("refreshToken returns the API response on success", async () => {
    apiMock.post.mockResolvedValue({ data: { success: true } });

    const result = await refreshToken();

    expect(apiMock.post).toHaveBeenCalledWith("/api/auth/refresh");
    expect(result).toEqual({ success: true });
});

test("getStoredUser returns the parsed local user", () => {
    localStorage.setItem("user", JSON.stringify({ id: "user-5", name: "Aurora" }));

    expect(getStoredUser()).toEqual({ id: "user-5", name: "Aurora" });
});

test("getStoredUser returns null when no user is stored", () => {
    localStorage.removeItem("user");

    expect(getStoredUser()).toBeNull();
});

test("updateProfile persists returned user data", async () => {
    apiMock.put.mockResolvedValue({
        data: {
            user: {
                id: "user-6",
                name: "Updated User",
            },
        },
    });

    const result = await updateProfile({ name: "Updated User" });

    expect(apiMock.put).toHaveBeenCalledWith("/api/user/profile", {
        name: "Updated User",
    });
    expect(result).toEqual({
        user: { id: "user-6", name: "Updated User" },
    });
    expect(JSON.parse(localStorage.getItem("user"))).toEqual({
        id: "user-6",
        name: "Updated User",
    });
});

test("changePassword posts the expected payload", async () => {
    apiMock.put.mockResolvedValue({ data: { success: true } });

    await changePassword({
        currentPassword: "OldPass1!",
        newPassword: "NewPass1!",
        confirmPassword: "NewPass1!",
    });

    expect(apiMock.put).toHaveBeenCalledWith("/api/user/change-password", {
        currentPassword: "OldPass1!",
        newPassword: "NewPass1!",
        confirmPassword: "NewPass1!",
    });
});

test("sendVerificationEmail calls the auth verification endpoint", async () => {
    apiMock.post.mockResolvedValue({ data: { success: true } });

    await sendVerificationEmail();

    expect(apiMock.post).toHaveBeenCalledWith("/api/auth/send-verification");
});

test("session endpoints call the expected APIs", async () => {
    apiMock.get.mockResolvedValue({ data: { sessions: [] } });
    apiMock.delete.mockResolvedValue({ data: { success: true } });

    await checkAuth();
    await getActiveSessions();
    await revokeSession("session-1");

    expect(apiMock.get).toHaveBeenNthCalledWith(1, "/api/auth/check");
    expect(apiMock.get).toHaveBeenNthCalledWith(2, "/api/user/sessions");
    expect(apiMock.delete).toHaveBeenCalledWith("/api/user/sessions/session-1");
});

test("logoutAllDevices clears session data on success", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "user-7" }));
    apiMock.post.mockResolvedValue({ data: { success: true } });

    const result = await logoutAllDevices();

    expect(apiMock.post).toHaveBeenCalledWith("/api/auth/logout-all");
    expect(localStorage.getItem("user")).toBeNull();
    expect(result).toEqual({ success: true });
});

test("2FA endpoints post the expected payloads", async () => {
    apiMock.post
        .mockResolvedValueOnce({ data: { setup: true } })
        .mockResolvedValueOnce({ data: { verified: true } })
        .mockResolvedValueOnce({ data: { disabled: true } })
        .mockResolvedValueOnce({ data: { user: { id: "user-8" } } });

    await enable2FA();
    await verify2FA("123456");
    await disable2FA("Str0ng@Pass1");
    await verify2FALogin("654321", "login-token");

    expect(apiMock.post).toHaveBeenNthCalledWith(1, "/api/auth/2fa/enable");
    expect(apiMock.post).toHaveBeenNthCalledWith(2, "/api/auth/2fa/verify", {
        code: "123456",
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(3, "/api/auth/2fa/disable", {
        password: "Str0ng@Pass1",
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(4, "/api/auth/2fa/verify-login", {
        code: "654321",
        loginToken: "login-token",
    });
    expect(JSON.parse(localStorage.getItem("user"))).toEqual({ id: "user-8" });
});

test("deleteAccount removes local user data", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "user-9" }));
    apiMock.delete.mockResolvedValue({ data: { success: true } });

    const result = await deleteAccount("Str0ng@Pass1");

    expect(apiMock.delete).toHaveBeenCalledWith("/api/user/account", {
        data: { password: "Str0ng@Pass1" },
    });
    expect(localStorage.getItem("user")).toBeNull();
    expect(result).toEqual({ success: true });
});

test("user preferences endpoints call the expected APIs", async () => {
    apiMock.get.mockResolvedValue({ data: { theme: "dark" } });
    apiMock.put.mockResolvedValue({ data: { theme: "light" } });

    const prefs = await getUserPreferences();
    const updated = await updateUserPreferences({ theme: "light" });

    expect(apiMock.get).toHaveBeenCalledWith("/api/user/preferences");
    expect(apiMock.put).toHaveBeenCalledWith("/api/user/preferences", {
        theme: "light",
    });
    expect(prefs).toEqual({ theme: "dark" });
    expect(updated).toEqual({ theme: "light" });
});

test("logoutAllDevices clears local data and normalizes failures", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "user-10" }));
    apiMock.post.mockRejectedValue({
        response: {
            data: { error: "Logout all failed" },
            status: 500,
        },
    });

    await expect(logoutAllDevices()).rejects.toEqual({
        message: "Logout all failed",
        status: 500,
    });

    expect(localStorage.getItem("user")).toBeNull();
});

test("verify2FALogin normalizes error responses", async () => {
    apiMock.post.mockRejectedValue({
        response: {
            data: { error: "Invalid code" },
            status: 401,
        },
    });

    await expect(verify2FALogin("123456", "login-token")).rejects.toEqual({
        message: "Invalid code",
        status: 401,
    });
});

test("deleteAccount normalizes error responses", async () => {
    apiMock.delete.mockRejectedValue({
        response: {
            data: { error: "Delete failed" },
            status: 400,
        },
    });

    await expect(deleteAccount("Str0ng@Pass1")).rejects.toEqual({
        message: "Delete failed",
        status: 400,
    });
});

test("getUserPreferences normalizes error responses", async () => {
    apiMock.get.mockRejectedValue({
        response: {
            data: { message: "Prefs unavailable" },
            status: 503,
        },
    });

    await expect(getUserPreferences()).rejects.toEqual({
        message: "Prefs unavailable",
        status: 503,
    });
});

test("updateUserPreferences normalizes missing message errors", async () => {
    apiMock.put.mockRejectedValue({});

    await expect(updateUserPreferences({ theme: "dark" })).rejects.toEqual({
        message: "Failed to update preferences",
        status: undefined,
    });
});

test("register and login normalize error payloads", async () => {
    apiMock.post
        .mockRejectedValueOnce({
            response: {
                data: { error: "Signup blocked", errors: { email: "Invalid" } },
                status: 422,
            },
        })
        .mockRejectedValueOnce({
            response: {
                data: { error: "Login blocked" },
                status: 401,
            },
        });

    await expect(register({ email: "bad@example.com" })).rejects.toEqual({
        message: "Signup blocked",
        errors: { email: "Invalid" },
        status: 422,
    });

    await expect(login({ email: "bad@example.com", password: "bad" })).rejects.toEqual({
        message: "Login blocked",
        errors: {},
        status: 401,
    });
});

test("resetPassword and forgotPassword normalize default error messages", async () => {
    apiMock.post
        .mockRejectedValueOnce({
            response: {
                data: {},
                status: 400,
            },
        })
        .mockRejectedValueOnce({
            response: {
                data: {},
                status: 400,
            },
        });

    await expect(resetPassword({ token: "token", password: "Str0ng@Pass1" })).rejects.toEqual({
        message: "Failed to reset password",
        errors: {},
        status: 400,
    });

    await expect(forgotPassword("aurora@example.com")).rejects.toEqual({
        message: "Failed to send reset email",
        status: 400,
    });
});

test("revokeSession normalizes errors", async () => {
    apiMock.delete.mockRejectedValue({
        response: {
            data: { message: "Revoke failed" },
            status: 500,
        },
    });

    await expect(revokeSession("session-99")).rejects.toEqual({
        message: "Revoke failed",
        status: 500,
    });
});

test("2FA endpoints normalize errors", async () => {
    apiMock.post
        .mockRejectedValueOnce({
            response: {
                data: { message: "Enable failed" },
                status: 400,
            },
        })
        .mockRejectedValueOnce({
            response: {
                data: { message: "Verify failed" },
                status: 401,
            },
        })
        .mockRejectedValueOnce({
            response: {
                data: { message: "Disable failed" },
                status: 403,
            },
        });

    await expect(enable2FA()).rejects.toEqual({
        message: "Enable failed",
        status: 400,
    });
    await expect(verify2FA("123456")).rejects.toEqual({
        message: "Verify failed",
        status: 401,
    });
    await expect(disable2FA("Str0ng@Pass1")).rejects.toEqual({
        message: "Disable failed",
        status: 403,
    });
});

test("register does not persist when the user payload is missing", async () => {
    apiMock.post.mockResolvedValue({
        data: {
            success: true,
            data: {},
        },
    });

    await register({ name: "Aurora", email: "aurora@example.com", password: "Pass1!" });

    expect(localStorage.getItem("user")).toBeNull();
});

test("login stores response.data.user when present", async () => {
    apiMock.post.mockResolvedValue({
        data: {
            success: true,
            user: {
                id: "user-11",
                name: "Direct User",
            },
        },
    });

    await login({ email: "aurora@example.com", password: "Pass1!" });

    expect(JSON.parse(localStorage.getItem("user"))).toEqual({
        id: "user-11",
        name: "Direct User",
    });
});

test("login does not persist when user payload is missing", async () => {
    apiMock.post.mockResolvedValue({
        data: {
            success: true,
        },
    });

    await login({ email: "aurora@example.com", password: "Pass1!" });

    expect(localStorage.getItem("user")).toBeNull();
});

test("updateProfile does not persist when user data is missing", async () => {
    apiMock.put.mockResolvedValue({ data: { updated: true } });

    const result = await updateProfile({ name: "No User" });

    expect(result).toEqual({ updated: true });
    expect(localStorage.getItem("user")).toBeNull();
});

test("verify2FALogin does not persist when no user payload is returned", async () => {
    apiMock.post.mockResolvedValue({ data: { success: true } });

    await verify2FALogin("123456", "token-1");

    expect(localStorage.getItem("user")).toBeNull();
});

test("service errors prefer response message across endpoints", async () => {
    const err = makeError({ message: "Service down" }, 503);

    const postCalls = [
        () => register({ email: "aurora@example.com", password: "Pass1!" }),
        () => login({ email: "aurora@example.com", password: "Pass1!" }),
        () => forgotPassword("aurora@example.com"),
        () => resetPassword({ token: "token", password: "Pass1!" }),
        () => sendVerificationEmail(),
        () => verifyEmail("verify-token"),
        () => refreshToken(),
        () => logoutAllDevices(),
        () => enable2FA(),
        () => verify2FA("123456"),
        () => disable2FA("Pass1!"),
        () => verify2FALogin("123456", "login-token"),
    ];

    postCalls.forEach(() => apiMock.post.mockRejectedValueOnce(err));
    for (const call of postCalls) {
        await expect(call()).rejects.toMatchObject({
            message: "Service down",
            status: 503,
        });
    }

    const getCalls = [
        () => getUserInfo(),
        () => checkAuth(),
        () => getActiveSessions(),
        () => getUserPreferences(),
    ];
    getCalls.forEach(() => apiMock.get.mockRejectedValueOnce(err));
    for (const call of getCalls) {
        await expect(call()).rejects.toMatchObject({
            message: "Service down",
            status: 503,
        });
    }

    const putCalls = [
        () => updateProfile({ name: "Aurora" }),
        () => changePassword({ currentPassword: "Old1!", newPassword: "New1!", confirmPassword: "New1!" }),
        () => updateUserPreferences({ theme: "dark" }),
    ];
    putCalls.forEach(() => apiMock.put.mockRejectedValueOnce(err));
    for (const call of putCalls) {
        await expect(call()).rejects.toMatchObject({
            message: "Service down",
            status: 503,
        });
    }

    const deleteCalls = [
        () => revokeSession("session-1"),
        () => deleteAccount("Pass1!"),
    ];
    deleteCalls.forEach(() => apiMock.delete.mockRejectedValueOnce(err));
    for (const call of deleteCalls) {
        await expect(call()).rejects.toMatchObject({
            message: "Service down",
            status: 503,
        });
    }
});

test("service errors fall back to response error field when message is missing", async () => {
    const err = makeError({ error: "Backend down" }, 502);

    apiMock.post
        .mockRejectedValueOnce(err) // register
        .mockRejectedValueOnce(err) // login
        .mockRejectedValueOnce(err) // resetPassword
        .mockRejectedValueOnce(err) // refreshToken
        .mockRejectedValueOnce(err) // logoutAllDevices
        .mockRejectedValueOnce(err); // verify2FALogin

    apiMock.delete.mockRejectedValueOnce(err); // deleteAccount

    await expect(register({ email: "aurora@example.com" })).rejects.toMatchObject({
        message: "Backend down",
        status: 502,
    });
    await expect(login({ email: "aurora@example.com", password: "Pass1!" })).rejects.toMatchObject({
        message: "Backend down",
        status: 502,
    });
    await expect(resetPassword({ token: "token", password: "Pass1!" })).rejects.toMatchObject({
        message: "Backend down",
        status: 502,
    });
    await expect(refreshToken()).rejects.toMatchObject({
        message: "Backend down",
        status: 502,
    });
    await expect(logoutAllDevices()).rejects.toMatchObject({
        message: "Backend down",
        status: 502,
    });
    await expect(verify2FALogin("123456", "login-token")).rejects.toMatchObject({
        message: "Backend down",
        status: 502,
    });
    await expect(deleteAccount("Pass1!")).rejects.toMatchObject({
        message: "Backend down",
        status: 502,
    });
});

test("default error messages are used when the payload is empty", async () => {
    const err = makeError({}, 500);

    const postCases = [
        { fn: () => register({ email: "aurora@example.com" }), message: "Registration failed" },
        { fn: () => login({ email: "aurora@example.com", password: "Pass1!" }), message: "Login failed" },
        { fn: () => forgotPassword("aurora@example.com"), message: "Failed to send reset email" },
        { fn: () => resetPassword({ token: "token", password: "Pass1!" }), message: "Failed to reset password" },
        { fn: () => sendVerificationEmail(), message: "Failed to send verification email" },
        { fn: () => verifyEmail("verify-token"), message: "Email verification failed" },
        { fn: () => refreshToken(), message: "Token refresh failed" },
        { fn: () => logoutAllDevices(), message: "Failed to logout from all devices" },
        { fn: () => enable2FA(), message: "Failed to enable 2FA" },
        { fn: () => verify2FA("123456"), message: "2FA verification failed" },
        { fn: () => disable2FA("Pass1!"), message: "Failed to disable 2FA" },
        { fn: () => verify2FALogin("123456", "login-token"), message: "2FA login verification failed" },
    ];

    postCases.forEach(() => apiMock.post.mockRejectedValueOnce(err));
    for (const { fn, message } of postCases) {
        await expect(fn()).rejects.toMatchObject({ message, status: 500 });
    }

    const getCases = [
        { fn: () => getUserInfo(), message: "Failed to fetch user info" },
        { fn: () => checkAuth(), message: "Authentication check failed" },
        { fn: () => getActiveSessions(), message: "Failed to fetch sessions" },
        { fn: () => getUserPreferences(), message: "Failed to fetch preferences" },
    ];
    getCases.forEach(() => apiMock.get.mockRejectedValueOnce(err));
    for (const { fn, message } of getCases) {
        await expect(fn()).rejects.toMatchObject({ message, status: 500 });
    }

    const putCases = [
        { fn: () => updateProfile({ name: "Aurora" }), message: "Failed to update profile" },
        {
            fn: () => changePassword({ currentPassword: "Old1!", newPassword: "New1!", confirmPassword: "New1!" }),
            message: "Failed to change password",
        },
        { fn: () => updateUserPreferences({ theme: "dark" }), message: "Failed to update preferences" },
    ];
    putCases.forEach(() => apiMock.put.mockRejectedValueOnce(err));
    for (const { fn, message } of putCases) {
        await expect(fn()).rejects.toMatchObject({ message, status: 500 });
    }

    const deleteCases = [
        { fn: () => revokeSession("session-1"), message: "Failed to revoke session" },
        { fn: () => deleteAccount("Pass1!"), message: "Failed to delete account" },
    ];
    deleteCases.forEach(() => apiMock.delete.mockRejectedValueOnce(err));
    for (const { fn, message } of deleteCases) {
        await expect(fn()).rejects.toMatchObject({ message, status: 500 });
    }
});

test("validation errors are preserved for profile and password flows", async () => {
    const err = makeError({ message: "Validation failed", errors: { field: "invalid" } }, 422);

    apiMock.post.mockRejectedValueOnce(err);
    await expect(login({ email: "aurora@example.com", password: "Pass1!" })).rejects.toEqual({
        message: "Validation failed",
        errors: { field: "invalid" },
        status: 422,
    });

    apiMock.put.mockRejectedValueOnce(err);
    await expect(updateProfile({ name: "Aurora" })).rejects.toEqual({
        message: "Validation failed",
        errors: { field: "invalid" },
        status: 422,
    });

    apiMock.put.mockRejectedValueOnce(err);
    await expect(changePassword({ currentPassword: "Old1!", newPassword: "New1!", confirmPassword: "New1!" })).rejects.toEqual({
        message: "Validation failed",
        errors: { field: "invalid" },
        status: 422,
    });

    apiMock.post.mockRejectedValueOnce(err);
    await expect(resetPassword({ token: "token", password: "Pass1!" })).rejects.toEqual({
        message: "Validation failed",
        errors: { field: "invalid" },
        status: 422,
    });
});
