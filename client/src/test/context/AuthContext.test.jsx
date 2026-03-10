import { render } from "@testing-library/react";
import { expect, test } from "vitest";

import { useAuth } from "../../context/AuthContext";

function BrokenConsumer() {
    useAuth();
    return null;
}

test("useAuth throws when used outside AuthProvider", () => {
    expect(() => render(<BrokenConsumer />)).toThrowError(
        "useAuth must be used within AuthProvider"
    );
});
