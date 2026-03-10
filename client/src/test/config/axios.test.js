import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { createMock, refreshTokenMock } = vi.hoisted(() => ({
    createMock: vi.fn(),
    refreshTokenMock: vi.fn(),
}));

vi.mock("axios", () => ({
    default: {
        create: createMock,
    },
}));

vi.mock("../../service/auth.service", () => ({
    refreshToken: (...args) => refreshTokenMock(...args),
}));

let originalLocation;

const setupAxios = async ({ apiUrl } = {}) => {
    await vi.resetModules();

    if (apiUrl !== undefined) {
        vi.stubEnv("VITE_API_URL", apiUrl);
    }

    let responseRejected;
    let responseFulfilled;
    const apiCallMock = vi.fn().mockResolvedValue({ data: "ok" });
    const responseUseMock = vi.fn((_onFulfilled, onRejected) => {
        responseFulfilled = _onFulfilled;
        responseRejected = onRejected;
    });

    const instance = Object.assign(apiCallMock, {
        interceptors: {
            response: {
                use: responseUseMock,
            },
        },
    });

    createMock.mockReturnValue(instance);

    await import("../../config/axios.js");

    return { apiCallMock, responseRejected, responseFulfilled };
};

beforeEach(() => {
    createMock.mockReset();
    refreshTokenMock.mockReset();
    originalLocation = window.location;
});

afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
    });
});

test("creates the axios client with normalized base URL defaults", async () => {
    await setupAxios({ apiUrl: "http://api.example.com///" });

    expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
            baseURL: "http://api.example.com",
            withCredentials: true,
            timeout: 30000,
        })
    );
});

test("falls back to localhost when VITE_API_URL is not set", async () => {
    await setupAxios({ apiUrl: "" });

    expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
            baseURL: "http://localhost:3000",
        })
    );
});

test("rejects immediately when the axios error lacks request config", async () => {
    const { responseRejected } = await setupAxios();

    const error = new Error("missing config");

    await expect(responseRejected(error)).rejects.toBe(error);
});

test("passes through successful responses", async () => {
    const { responseFulfilled } = await setupAxios();
    const response = { data: { ok: true } };

    expect(responseFulfilled(response)).toBe(response);
});

test("skips token refresh for auth endpoints", async () => {
    const { responseRejected } = await setupAxios();

    const error = {
        response: { status: 401 },
        config: { url: "/api/auth/login" },
    };

    await expect(responseRejected(error)).rejects.toBe(error);
    expect(refreshTokenMock).not.toHaveBeenCalled();
});

test("does not retry when the request was already retried", async () => {
    const { responseRejected } = await setupAxios();

    const error = {
        response: { status: 401 },
        config: { url: "/api/secure", _retry: true },
    };

    await expect(responseRejected(error)).rejects.toBe(error);
    expect(refreshTokenMock).not.toHaveBeenCalled();
});

test("refreshes tokens and retries the original request", async () => {
    refreshTokenMock.mockResolvedValue({ data: { success: true } });
    const { apiCallMock, responseRejected } = await setupAxios();

    const originalRequest = { url: "/api/secure" };
    const error = {
        response: { status: 401 },
        config: originalRequest,
    };

    await responseRejected(error);

    expect(refreshTokenMock).toHaveBeenCalledTimes(1);
    expect(originalRequest._retry).toBe(true);
    expect(apiCallMock).toHaveBeenCalledWith(originalRequest);
});

test("refreshes tokens when the request url is missing", async () => {
    refreshTokenMock.mockResolvedValue({ data: { success: true } });
    const { apiCallMock, responseRejected } = await setupAxios();

    const originalRequest = {};
    const error = {
        response: { status: 401 },
        config: originalRequest,
    };

    await responseRejected(error);

    expect(refreshTokenMock).toHaveBeenCalledTimes(1);
    expect(originalRequest._retry).toBe(true);
    expect(apiCallMock).toHaveBeenCalledWith(originalRequest);
});

test("queues requests during refresh and replays them once resolved", async () => {
    let resolveRefresh;
    refreshTokenMock.mockImplementation(
        () => new Promise((resolve) => {
            resolveRefresh = resolve;
        })
    );

    const { apiCallMock, responseRejected } = await setupAxios();

    const firstError = {
        response: { status: 401 },
        config: { url: "/api/secure" },
    };
    const secondError = {
        response: { status: 401 },
        config: { url: "/api/secure?page=2" },
    };

    const firstPromise = responseRejected(firstError);
    const secondPromise = responseRejected(secondError);

    expect(refreshTokenMock).toHaveBeenCalledTimes(1);

    resolveRefresh({ data: { success: true } });

    await Promise.all([firstPromise, secondPromise]);

    expect(apiCallMock).toHaveBeenCalledWith(firstError.config);
    expect(apiCallMock).toHaveBeenCalledWith(secondError.config);
});

test("clears session data and signals expiration when refresh fails", async () => {
    const refreshError = new Error("refresh failed");
    refreshTokenMock.mockRejectedValue(refreshError);
    const { responseRejected } = await setupAxios();

    localStorage.setItem("user", JSON.stringify({ id: "user-1" }));

    Object.defineProperty(window, "location", {
        configurable: true,
        value: {
            ...originalLocation,
            pathname: "/main",
        },
    });

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    const error = {
        response: { status: 401 },
        config: { url: "/api/secure" },
    };

    await expect(responseRejected(error)).rejects.toBe(refreshError);

    expect(localStorage.getItem("user")).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "auth:session-expired" })
    );
});

test("queued requests reject when refresh fails", async () => {
    let rejectRefresh;
    const refreshError = new Error("refresh failed");
    refreshTokenMock.mockImplementation(
        () => new Promise((_, reject) => {
            rejectRefresh = reject;
        })
    );

    const { responseRejected } = await setupAxios();

    const firstError = {
        response: { status: 401 },
        config: { url: "/api/secure" },
    };
    const secondError = {
        response: { status: 401 },
        config: { url: "/api/secure?page=2" },
    };

    const firstPromise = responseRejected(firstError);
    const secondPromise = responseRejected(secondError);

    rejectRefresh(refreshError);

    await expect(firstPromise).rejects.toBe(refreshError);
    await expect(secondPromise).rejects.toBe(refreshError);
});

test("does not dispatch session-expired when already on auth routes", async () => {
    const refreshError = new Error("refresh failed");
    refreshTokenMock.mockRejectedValue(refreshError);
    const { responseRejected } = await setupAxios();

    Object.defineProperty(window, "location", {
        configurable: true,
        value: {
            ...originalLocation,
            pathname: "/home/auth",
        },
    });

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    const error = {
        response: { status: 401 },
        config: { url: "/api/secure" },
    };

    await expect(responseRejected(error)).rejects.toBe(refreshError);

    expect(dispatchSpy).not.toHaveBeenCalled();
});
