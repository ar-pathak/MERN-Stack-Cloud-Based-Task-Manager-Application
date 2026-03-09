import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import SocialAuthSection from "./SocialAuthSection.jsx";

let originalLocation;

beforeEach(() => {
    originalLocation = window.location;
    vi.stubEnv("VITE_API_URL", "http://api.example.com/");
});

afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
    });
});

test("starts Google OAuth with a sanitized redirect path", async () => {
    const user = userEvent.setup();
    const assignMock = vi.fn();

    Object.defineProperty(window, "location", {
        configurable: true,
        value: {
            ...originalLocation,
            search: "?redirect=/main/feed",
            assign: assignMock,
        },
    });

    render(<SocialAuthSection />);

    await user.click(screen.getByRole("button", { name: "Google" }));

    expect(assignMock).toHaveBeenCalledWith(
        "http://api.example.com/api/auth/oauth/google?redirect=%2Fmain%2Ffeed"
    );
});

test("falls back to /main when the redirect query is unsafe", async () => {
    const user = userEvent.setup();
    const assignMock = vi.fn();

    Object.defineProperty(window, "location", {
        configurable: true,
        value: {
            ...originalLocation,
            search: "?redirect=//evil.example",
            assign: assignMock,
        },
    });

    render(<SocialAuthSection />);

    await user.click(screen.getByRole("button", { name: "GitHub" }));

    expect(assignMock).toHaveBeenCalledWith(
        "http://api.example.com/api/auth/oauth/github?redirect=%2Fmain"
    );
});
