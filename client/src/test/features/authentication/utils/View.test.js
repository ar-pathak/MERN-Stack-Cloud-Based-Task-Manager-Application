import { expect, test } from "vitest";

import { views } from "../../../../features/authentication/utils/view.js";

test("views exports the supported authentication states", () => {
    expect(views).toEqual({
        LOGIN: "login",
        SIGNUP: "signup",
        FORGOT: "forgot",
        RESET: "reset",
        VERIFY: "verify",
    });
    expect(new Set(Object.values(views)).size).toBe(5);
});
