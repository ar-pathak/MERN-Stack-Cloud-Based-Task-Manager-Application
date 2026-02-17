import { useMemo } from 'react';

export const usePermissions = (item) => {
    return useMemo(() => {
        if (!item || !item.permissions) {
            return {
                canCreateProject: false,
                canCreateTask: false,
                canCreateSubtask: false,
                role: null
            };
        }

        const { permissions } = item;

        return {
            canCreateProject: permissions.canCreateProject || false,
            canCreateTask: permissions.canCreateTask || false,
            canCreateSubtask: permissions.canCreateSubtask || false,
            role: permissions.role || null,
            isProjectAdmin: Boolean(permissions.isProjectAdmin),
            inheritedFromWorkspace: Boolean(permissions.inheritedFromWorkspace),
            isOwner: permissions.role === 'owner',
            isAdmin: permissions.role === 'admin' || permissions.role === 'owner',
            canEdit: ['owner', 'admin', 'editor', 'member', 'creator', 'assignee'].includes(permissions.role),
            canView: true // If item is visible, user can view it
        };
    }, [item]);
};
