import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, test, expect } from "vitest";

import TextInput from "../../../../features/authentication/components/TextInput.jsx";

test("renders label and forwards typed values to onChange", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
        <TextInput
            label="Email"
            name="email"
            value=""
            placeholder="Enter your email"
            onChange={handleChange}
        />
    );

    const input = screen.getByLabelText(/email/i);
    await user.type(input, "ab");

    expect(input).toHaveAttribute("name", "email");
    expect(handleChange).toHaveBeenNthCalledWith(1, "a");
    expect(handleChange).toHaveBeenNthCalledWith(2, "b");
});
