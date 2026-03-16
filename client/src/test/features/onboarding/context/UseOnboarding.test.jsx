import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useOnboarding } from "../../../../features/onboarding/context/useOnboarding";
import { OnboardingContext } from "../../../../features/onboarding/context/onboardingContextState";

const OnboardingConsumer = () => {
  const value = useOnboarding();
  return <div data-testid="onboarding-value">{value.step}</div>;
};

describe("useOnboarding", () => {
  it("throws when used outside OnboardingContext", () => {
    expect(() => render(<OnboardingConsumer />)).toThrow(
      "useOnboarding must be used within OnboardingProvider",
    );
  });

  it("returns the current onboarding context value", () => {
    render(
      <OnboardingContext.Provider value={{ step: "tour-start" }}>
        <OnboardingConsumer />
      </OnboardingContext.Provider>,
    );

    expect(screen.getByTestId("onboarding-value")).toHaveTextContent("tour-start");
  });

  it("exports the shared onboarding context instance", () => {
    expect(OnboardingContext).toBeDefined();
    expect(typeof OnboardingContext.Provider).toBe("object");
  });
});
