import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("main entrypoint", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("react-dom/client");
    vi.doUnmock("react-router");
    vi.doUnmock("react-redux");
    vi.doUnmock("../index.css");
    document.body.innerHTML = "";
  });

  it("mounts the router inside the redux provider", async () => {
    const createRoot = vi.fn(() => ({ render: (node) => render(node) }));

    document.body.innerHTML = '<div id="root"></div>';

    vi.doMock("react-dom/client", () => ({ createRoot }));
    vi.doMock("react-router", () => ({
      RouterProvider: ({ router }) => <div data-testid="router-provider">{router.name}</div>,
    }));
    vi.doMock("react-redux", () => ({
      Provider: ({ store, children }) => (
        <div data-testid="redux-provider" data-state={JSON.stringify(store.getState())}>
          {children}
        </div>
      ),
    }));
    vi.doMock("../router/router.jsx", () => ({
      default: { name: "mock-router" },
    }));
    vi.doMock("../store", () => ({
      store: {
        getState: () => ({ ready: true }),
      },
    }));
    vi.doMock("../index.css", () => ({}));

    await import("../main.jsx");

    expect(createRoot).toHaveBeenCalledWith(document.getElementById("root"));
    expect(screen.getByTestId("redux-provider")).toHaveAttribute(
      "data-state",
      JSON.stringify({ ready: true }),
    );
    expect(screen.getByTestId("router-provider")).toHaveTextContent("mock-router");
  });
});
