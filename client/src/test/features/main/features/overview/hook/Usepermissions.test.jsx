import { renderHook } from "@testing-library/react";
import { expect, test } from "vitest";

import { usePermissions } from "../../../../../../features/main/features/overview/hook/usePermissions.js";

test("usePermissions returns conservative defaults when permissions are missing", () => {
    const { result, rerender } = renderHook(
        ({ item }) => usePermissions(item),
        {
            initialProps: { item: null },
        }
    );

    expect(result.current).toEqual({
        canCreateProject: false,
        canCreateTask: false,
        canCreateSubtask: false,
        role: null,
    });

    rerender({ item: {} });

    expect(result.current).toEqual({
        canCreateProject: false,
        canCreateTask: false,
        canCreateSubtask: false,
        role: null,
    });
});

test("usePermissions derives ownership and editing flags from the permission payload", () => {
    const { result, rerender } = renderHook(
        ({ item }) => usePermissions(item),
        {
            initialProps: {
                item: {
                    permissions: {
                        canCreateProject: true,
                        canCreateTask: true,
                        canCreateSubtask: true,
                        role: "owner",
                        isProjectAdmin: 1,
                        inheritedFromWorkspace: 0,
                    },
                },
            },
        }
    );

    expect(result.current).toEqual({
        canCreateProject: true,
        canCreateTask: true,
        canCreateSubtask: true,
        role: "owner",
        isProjectAdmin: true,
        inheritedFromWorkspace: false,
        isOwner: true,
        isAdmin: true,
        canEdit: true,
        canView: true,
    });

    rerender({
        item: {
            permissions: {
                role: "viewer",
                inheritedFromWorkspace: true,
            },
        },
    });

    expect(result.current).toEqual({
        canCreateProject: false,
        canCreateTask: false,
        canCreateSubtask: false,
        role: "viewer",
        isProjectAdmin: false,
        inheritedFromWorkspace: true,
        isOwner: false,
        isAdmin: false,
        canEdit: false,
        canView: true,
    });
});