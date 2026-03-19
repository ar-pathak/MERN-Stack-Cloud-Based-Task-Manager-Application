import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  navigateMock,
  useLocationMock,
  useSelectorMock,
  useAuthMock,
  getOnboardingStorageKeyMock,
  readOnboardingRecordMock,
  writeOnboardingRecordMock,
  overlayRenderMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useLocationMock: vi.fn(),
  useSelectorMock: vi.fn(),
  useAuthMock: vi.fn(),
  getOnboardingStorageKeyMock: vi.fn(),
  readOnboardingRecordMock: vi.fn(),
  writeOnboardingRecordMock: vi.fn(),
  overlayRenderMock: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => useLocationMock(),
  };
});

vi.mock("react-redux", () => ({
  useSelector: (selector) => useSelectorMock(selector),
}));

vi.mock("../../../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../../features/onboarding/utils/onboardingStorage", () => ({
  getOnboardingStorageKey: (...args) => getOnboardingStorageKeyMock(...args),
  readOnboardingRecord: (...args) => readOnboardingRecordMock(...args),
  writeOnboardingRecord: (...args) => writeOnboardingRecordMock(...args),
}));

vi.mock("../../../../features/onboarding/components/OnboardingTourOverlay", () => ({
  default: (props) => {
    overlayRenderMock(props);

    return props.isOpen ? (
      <div data-testid="tour-overlay">{props.step?.id || "none"}</div>
    ) : null;
  },
}));

import { TOUR_ROLE } from "../../../../features/onboarding/constants/tourSteps.js";
import { OnboardingProvider } from "../../../../features/onboarding/context/OnboardingContext.jsx";
import { useOnboarding } from "../../../../features/onboarding/context/useOnboarding.js";

let selectorState;

const OnboardingConsumer = () => {
  const value = useOnboarding();

  return (
    <div>
      <div data-testid="tour-open">{String(value.isTourOpen)}</div>
      <div data-testid="tour-role">{value.tourRole}</div>
      <div data-testid="tour-step">{value.currentStep?.id || "none"}</div>
      <div data-testid="tour-index">{String(value.currentStepIndex)}</div>
      <button type="button" onClick={value.nextStep}>
        Next Step
      </button>
    </div>
  );
};

describe("OnboardingProvider", () => {
  beforeEach(() => {
    selectorState = {
      overview: {
        overviewData: {
          timeline: [],
        },
      },
    };

    vi.clearAllMocks();

    useLocationMock.mockReturnValue({ pathname: "/main" });
    useSelectorMock.mockImplementation((selector) => selector(selectorState));
    useAuthMock.mockReturnValue({
      user: { _id: "user-1", role: "owner" },
      isAuthenticated: true,
    });
    getOnboardingStorageKeyMock.mockImplementation((userId) =>
      userId ? `onboarding:${userId}` : "",
    );
    readOnboardingRecordMock.mockReturnValue(null);
  });

  it("starts a new tour for authenticated main-route users and persists the initial record", async () => {
    render(
      <OnboardingProvider>
        <OnboardingConsumer />
      </OnboardingProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("tour-open")).toHaveTextContent("true");
      expect(screen.getByTestId("tour-role")).toHaveTextContent(TOUR_ROLE.OWNER);
      expect(screen.getByTestId("tour-step")).toHaveTextContent("owner-sidebar-overview");
    });

    expect(screen.getByTestId("tour-overlay")).toHaveTextContent("owner-sidebar-overview");
    expect(writeOnboardingRecordMock).toHaveBeenCalledWith(
      "onboarding:user-1",
      expect.objectContaining({
        role: TOUR_ROLE.OWNER,
        status: "active",
        stepIndex: 0,
      }),
    );
  });

  it("restores an active saved tour and advances to the next step when requested", async () => {
    const user = userEvent.setup();

    useAuthMock.mockReturnValue({
      user: { _id: "user-2", role: "member" },
      isAuthenticated: true,
    });
    readOnboardingRecordMock.mockReturnValue({
      role: TOUR_ROLE.MEMBER,
      status: "active",
      stepIndex: 1,
      startedAt: "2026-03-18T09:00:00.000Z",
    });

    render(
      <OnboardingProvider>
        <OnboardingConsumer />
      </OnboardingProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("tour-role")).toHaveTextContent(TOUR_ROLE.MEMBER);
      expect(screen.getByTestId("tour-step")).toHaveTextContent("member-create-task");
      expect(screen.getByTestId("tour-index")).toHaveTextContent("1");
    });

    await user.click(screen.getByRole("button", { name: /next step/i }));

    await waitFor(() => {
      expect(screen.getByTestId("tour-step")).toHaveTextContent("member-timeline");
      expect(screen.getByTestId("tour-index")).toHaveTextContent("2");
    });

    expect(writeOnboardingRecordMock).toHaveBeenCalledWith(
      "onboarding:user-2",
      expect.objectContaining({
        role: TOUR_ROLE.MEMBER,
        status: "active",
        stepIndex: 2,
      }),
    );
  });

  it("navigates to the current tour route when the saved active step targets another page", async () => {
    useAuthMock.mockReturnValue({
      user: { _id: "user-3", role: "member" },
      isAuthenticated: true,
    });
    readOnboardingRecordMock.mockReturnValue({
      role: TOUR_ROLE.MEMBER,
      status: "active",
      stepIndex: 5,
      startedAt: "2026-03-18T09:00:00.000Z",
    });

    render(
      <OnboardingProvider>
        <OnboardingConsumer />
      </OnboardingProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("tour-step")).toHaveTextContent("member-retake-tour");
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/main/support");
    });
  });
});
