import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToggleContext, useToggle } from "../../context/ToggleContext";
import { ToggleProvider } from "../../context/ToggleProvider";

const ToggleConsumer = () => {
  const { isToggle, setIsToggle } = useToggle();

  return (
    <div>
      <span data-testid="toggle-state">{String(isToggle)}</span>
      <button type="button" onClick={() => setIsToggle((value) => !value)}>
        Toggle
      </button>
    </div>
  );
};

describe("Toggle context", () => {
  it("throws when useToggle is used outside the provider", () => {
    expect(() => render(<ToggleConsumer />)).toThrow(
      "useToggle must be used within toggle provider",
    );
  });

  it("provides the toggle state and updater through ToggleProvider", () => {
    render(
      <ToggleProvider>
        <ToggleConsumer />
      </ToggleProvider>,
    );

    expect(screen.getByTestId("toggle-state")).toHaveTextContent("false");

    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));

    expect(screen.getByTestId("toggle-state")).toHaveTextContent("true");
  });

  it("reads from ToggleContext directly when a value is provided", () => {
    render(
      <ToggleContext.Provider value={{ isToggle: true, setIsToggle: () => {} }}>
        <ToggleConsumer />
      </ToggleContext.Provider>,
    );

    expect(screen.getByTestId("toggle-state")).toHaveTextContent("true");
  });
});
