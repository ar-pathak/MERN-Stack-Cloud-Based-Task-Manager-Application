import { render } from "@testing-library/react";
import { expect, test } from "vitest";

import ScrollBar from "../../../common/components/ScrollBar";

test("ScrollBar injects the custom scrollbar styles", () => {
  const { container } = render(<ScrollBar />);

  const styleTag = container.querySelector("style");
  expect(styleTag).toBeInTheDocument();
  expect(styleTag?.textContent).toContain(".custom-scrollbar::-webkit-scrollbar");
  expect(styleTag?.textContent).toContain("scrollbar-width: thin");
  expect(styleTag?.textContent).toContain("background-color: #475569");
});
