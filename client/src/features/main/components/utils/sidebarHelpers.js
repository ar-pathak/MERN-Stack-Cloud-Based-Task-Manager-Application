import { COLOR_THEMES } from "../../constants/sidebarConfig";

export const isActiveRoute = (path, currentPath) => {
    if (path === "/dashboard") {
        return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
};

export const getColorClasses = (color, active) => {
    const theme = COLOR_THEMES[color] || COLOR_THEMES.sky;
    return {
        bg: active ? theme.bg : theme.bgInactive,
        border: theme.border,
        text: active ? theme.text : theme.textInactive,
        icon: active ? theme.icon : theme.iconInactive,
        glow: theme.glow,
        hover: theme.hover,
        gradient: theme.gradient
    };
};