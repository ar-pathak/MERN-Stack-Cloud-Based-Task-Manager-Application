import { describe, expect, it } from "vitest";

import {
  MEMBER_TOUR_STEPS,
  OWNER_TOUR_STEPS,
  TOUR_ROLE,
  getTourStepsByRole,
} from "../../../../features/onboarding/constants/tourSteps";

describe("tour steps", () => {
  it("defines the supported onboarding roles", () => {
    expect(TOUR_ROLE).toEqual({
      OWNER: "owner",
      MEMBER: "member",
    });
  });

  it("returns owner steps for owner users", () => {
    expect(getTourStepsByRole(TOUR_ROLE.OWNER)).toBe(OWNER_TOUR_STEPS);
    expect(OWNER_TOUR_STEPS).toHaveLength(6);
    expect(OWNER_TOUR_STEPS[0]).toMatchObject({
      id: "owner-sidebar-overview",
      route: "/main",
      placement: "right",
    });
  });

  it("returns member steps for member users and unknown roles", () => {
    expect(getTourStepsByRole(TOUR_ROLE.MEMBER)).toBe(MEMBER_TOUR_STEPS);
    expect(getTourStepsByRole("guest")).toBe(MEMBER_TOUR_STEPS);
    expect(MEMBER_TOUR_STEPS).toHaveLength(6);
    expect(MEMBER_TOUR_STEPS[5]).toMatchObject({
      id: "member-retake-tour",
      route: "/main/support",
      placement: "bottom",
    });
  });
});
