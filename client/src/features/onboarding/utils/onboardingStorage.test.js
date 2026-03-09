import { test, expect } from "vitest";

import {
    ONBOARDING_STORAGE_VERSION,
    getOnboardingStorageKey,
    readOnboardingRecord,
    removeOnboardingRecord,
    writeOnboardingRecord,
} from "./onboardingStorage.js";

test("getOnboardingStorageKey returns stable per-user keys", () => {
    expect(getOnboardingStorageKey("user-42")).toBe("task-manager:onboarding:user-42");
    expect(getOnboardingStorageKey("")).toBe("");
});

test("write, read and remove onboarding record round-trip safely", () => {
    const storageKey = getOnboardingStorageKey("user-1");
    writeOnboardingRecord(storageKey, { completed: true, step: 3 });

    expect(readOnboardingRecord(storageKey)).toEqual({
        version: ONBOARDING_STORAGE_VERSION,
        completed: true,
        step: 3,
    });

    removeOnboardingRecord(storageKey);
    expect(readOnboardingRecord(storageKey)).toBeNull();
});

test("readOnboardingRecord rejects malformed or outdated payloads", () => {
    const storageKey = getOnboardingStorageKey("user-2");
    localStorage.setItem(storageKey, "{");
    expect(readOnboardingRecord(storageKey)).toBeNull();

    localStorage.setItem(storageKey, JSON.stringify({ version: ONBOARDING_STORAGE_VERSION + 1 }));
    expect(readOnboardingRecord(storageKey)).toBeNull();
});
