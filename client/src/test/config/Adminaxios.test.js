import { afterEach, describe, expect, it, vi } from "vitest";

describe("admin axios config", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doUnmock("axios");
  });

  it("uses the default base URL when VITE_API_URL is missing", async () => {
    const create = vi.fn(() => ({ client: "default" }));
    vi.doMock("axios", () => ({
      default: {
        create,
      },
    }));

    const module = await import("../../config/adminAxios.js");

    expect(create).toHaveBeenCalledWith({
      baseURL: "http://localhost:3000",
      withCredentials: true,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
    expect(module.default).toEqual({ client: "default" });
  });

  it("trims trailing slashes from the configured base URL", async () => {
    const create = vi.fn(() => ({ client: "custom" }));
    vi.stubEnv("VITE_API_URL", "https://admin.example.com///");
    vi.doMock("axios", () => ({
      default: {
        create,
      },
    }));

    const module = await import("../../config/adminAxios.js");

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://admin.example.com",
      }),
    );
    expect(module.default).toEqual({ client: "custom" });
  });
});
