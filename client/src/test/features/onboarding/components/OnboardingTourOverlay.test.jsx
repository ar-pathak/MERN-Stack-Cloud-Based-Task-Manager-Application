import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    div: ({
      children,
      animate,
      exit,
      initial,
      transition,
      variants,
      whileHover,
      whileTap,
      ...rest
    }) => <div {...rest}>{children}</div>,
  },
}));

import OnboardingTourOverlay from "../../../../features/onboarding/components/OnboardingTourOverlay.jsx";

const baseStep = {
  id: "member-sidebar-overview",
  title: "Workspace Navigation",
  description: "Follow your work from the sidebar.",
  selector: '[data-tour="sidebar-overview-link"]',
  route: "/main",
  placement: "right",
};

describe("OnboardingTourOverlay", () => {
  it("renders nothing when the tour is closed", () => {
    render(<OnboardingTourOverlay isOpen={false} step={baseStep} />);

    expect(screen.queryByRole("dialog", { name: /onboarding tour/i })).not.toBeInTheDocument();
  });

  it("shows the fallback notice and handles keyboard shortcuts while open", () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    const onSkip = vi.fn();

    render(
      <OnboardingTourOverlay
        isOpen
        step={baseStep}
        stepIndex={0}
        totalSteps={6}
        onNext={onNext}
        onPrevious={onPrevious}
        onSkip={onSkip}
      />,
    );

    expect(screen.getByRole("dialog", { name: /onboarding tour/i })).toBeInTheDocument();
    expect(screen.getByText("Workspace Navigation")).toBeInTheDocument();
    expect(screen.getByText(/looking for this section/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it("highlights the current target and switches to the finish action on the last step", async () => {
    const target = document.createElement("button");
    const scrollIntoView = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    target.setAttribute("data-tour", "sidebar-overview-link");
    target.scrollIntoView = scrollIntoView;
    target.getBoundingClientRect = () => ({
      width: 120,
      height: 40,
      top: 120,
      left: 48,
      right: 168,
      bottom: 160,
      x: 48,
      y: 120,
      toJSON: () => ({}),
    });

    document.body.appendChild(target);

    render(
      <OnboardingTourOverlay
        isOpen
        step={baseStep}
        stepIndex={5}
        totalSteps={6}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    });

    await waitFor(() => {
      expect(screen.queryByText(/looking for this section/i)).not.toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /finish tour/i })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
    target.remove();
  });
});
