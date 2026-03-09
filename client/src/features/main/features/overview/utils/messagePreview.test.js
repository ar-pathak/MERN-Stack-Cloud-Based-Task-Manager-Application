import { test, expect } from "vitest";

import { getMessagePreviewText } from "./messagePreview.js";

test("getMessagePreviewText prioritizes trimmed content", () => {
    expect(getMessagePreviewText({ content: "  Hello Aurora  ", type: "image" })).toBe("Hello Aurora");
});

test("getMessagePreviewText falls back by message type", () => {
    expect(getMessagePreviewText({ type: "post" })).toBe("Shared a post");
    expect(getMessagePreviewText({ sharedPost: { id: 1 } })).toBe("Shared a post");
    expect(getMessagePreviewText({ type: "image" })).toBe("Sent an image");
    expect(getMessagePreviewText({ type: "video" })).toBe("Sent a video");
    expect(getMessagePreviewText({ type: "audio" })).toBe("Sent an audio message");
    expect(getMessagePreviewText({ type: "file" })).toBe("Sent an attachment");
    expect(getMessagePreviewText({ type: "unknown" })).toBe("Sent a message");
    expect(getMessagePreviewText(null)).toBe("");
});
