import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Avatar from "../../../../features/authentication/components/Avatar.jsx";
import Badge from "../../../../features/authentication/components/Badge.jsx";

test("Badge renders its child content inside the pill shell", () => {
    const { container } = render(<Badge>Verified workspace</Badge>);

    expect(screen.getByText("Verified workspace")).toBeInTheDocument();
    expect(container.querySelector("span")).toHaveClass("rounded-full");
});

test("Avatar renders the Aurora initials and the verified check icon", () => {
    const { container } = render(<Avatar />);

    expect(screen.getByText("AU")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
});