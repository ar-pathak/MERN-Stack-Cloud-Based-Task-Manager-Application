import { test, expect } from "vitest";

import { COLOR_THEMES } from "../../../../../features/main/constants/sidebarConfig.js";
import { getColorClasses, isActiveRoute } from "../../../../../features/main/components/utils/sidebarHelpers.js";

test("isActiveRoute handles dashboard exactness and nested routes", () => {
    expect(isActiveRoute("/dashboard", "/dashboard")).toBe(true);
    expect(isActiveRoute("/dashboard", "/dashboard/stats")).toBe(false);
    expect(isActiveRoute("/main", "/main/feed")).toBe(true);
    expect(isActiveRoute("/main/feed", "/settings")).toBe(false);
});

test("getColorClasses returns requested theme and falls back to sky", () => {
    expect(getColorClasses("emerald", true)).toEqual({
        bg: COLOR_THEMES.emerald.bg,
        border: COLOR_THEMES.emerald.border,
        text: COLOR_THEMES.emerald.text,
        icon: COLOR_THEMES.emerald.icon,
        glow: COLOR_THEMES.emerald.glow,
        hover: COLOR_THEMES.emerald.hover,
        gradient: COLOR_THEMES.emerald.gradient,
    });

    expect(getColorClasses("unknown", false)).toEqual({
        bg: COLOR_THEMES.sky.bgInactive,
        border: COLOR_THEMES.sky.border,
        text: COLOR_THEMES.sky.textInactive,
        icon: COLOR_THEMES.sky.iconInactive,
        glow: COLOR_THEMES.sky.glow,
        hover: COLOR_THEMES.sky.hover,
        gradient: COLOR_THEMES.sky.gradient,
    });
});
