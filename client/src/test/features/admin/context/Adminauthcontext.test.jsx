import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminAuthContext, {
  useAdminAuth,
} from "../../../../features/admin/context/AdminAuthContext.js";
import ReExportedAdminAuthContext, {
  useAdminAuth as useAdminAuthFromJsx,
} from "../../../../features/admin/context/AdminAuthContext.jsx";

const AdminAuthConsumer = () => {
  const value = useAdminAuth();
  return <div data-testid="admin-auth-value">{value.status}</div>;
};

describe("AdminAuthContext", () => {
  it("throws when the hook is used outside the provider", () => {
    expect(() => render(<AdminAuthConsumer />)).toThrow(
      "useAdminAuth must be used within AdminAuthProvider",
    );
  });

  it("returns the current admin auth context value", () => {
    render(
      <AdminAuthContext.Provider value={{ status: "ready" }}>
        <AdminAuthConsumer />
      </AdminAuthContext.Provider>,
    );

    expect(screen.getByTestId("admin-auth-value")).toHaveTextContent("ready");
  });

  it("re-exports the same context and hook from the jsx entrypoint", () => {
    expect(ReExportedAdminAuthContext).toBe(AdminAuthContext);
    expect(useAdminAuthFromJsx).toBe(useAdminAuth);
  });
});
