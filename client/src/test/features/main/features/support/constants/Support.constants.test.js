import { describe, expect, it } from "vitest";

import {
  CATEGORY_OPTIONS,
  FEEDBACK_TYPE_OPTIONS,
  INITIAL_FEEDBACK_FORM,
  INITIAL_TICKET_FORM,
  MOBILE_BREAKPOINT,
  PRIORITY_CLASS_MAP,
  PRIORITY_LABEL_MAP,
  PRIORITY_OPTIONS,
  STATUS_CLASS_MAP,
  STATUS_LABEL_MAP,
  STATUS_OPTIONS,
} from "../../../../../../features/main/features/support/constants/support.constants";

describe("support constants", () => {
  it("defines the support form breakpoints and options", () => {
    expect(MOBILE_BREAKPOINT).toBe(1024);
    expect(CATEGORY_OPTIONS).toHaveLength(7);
    expect(PRIORITY_OPTIONS).toEqual([
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "urgent", label: "Urgent" },
    ]);
    expect(STATUS_OPTIONS).toEqual([
      { value: "open", label: "Open" },
      { value: "in_progress", label: "In Progress" },
      { value: "resolved", label: "Resolved" },
      { value: "closed", label: "Closed" },
    ]);
    expect(FEEDBACK_TYPE_OPTIONS).toEqual([
      { value: "feature_request", label: "Feature Request" },
      { value: "bug_report", label: "Bug Report" },
    ]);
  });

  it("defines label and class maps for priorities and statuses", () => {
    expect(STATUS_LABEL_MAP.closed).toBe("Closed");
    expect(PRIORITY_LABEL_MAP.urgent).toBe("Urgent");
    expect(STATUS_CLASS_MAP.in_progress).toContain("amber");
    expect(PRIORITY_CLASS_MAP.high).toContain("amber");
  });

  it("defines the initial ticket and feedback form state", () => {
    expect(INITIAL_TICKET_FORM).toEqual({
      subject: "",
      category: "account",
      description: "",
      priority: "medium",
    });
    expect(INITIAL_FEEDBACK_FORM).toEqual({
      type: "feature_request",
      category: "account",
      title: "",
      message: "",
      rating: 5,
    });
  });
});

