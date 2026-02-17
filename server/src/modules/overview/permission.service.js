const Project = require('../../models/project');
const Task = require('../../models/tasks');
const Workspace = require('../../models/workspace');
const WorkspaceMember = require('../../models/workspaceMember');

class PermissionService {
    canCreateWorkspace(userId) {
        return true;
    }

    async getWorkspacePermissions(workspaceId, userId) {
        try {
            const workspace = await Workspace.findById(workspaceId);
            if (!workspace) return { canView: false, canEdit: false, canManage: false, role: null };

            if (String(workspace.createdBy) === String(userId)) {
                return { canView: true, canEdit: true, canManage: true, role: 'owner', canCreateProject: true, canCreateTask: true };
            }

            const member = await WorkspaceMember.findOne({ workspace: workspaceId, user: userId });
            if (!member) return { canView: false, canEdit: false, canManage: false, role: null };

            return {
                role: member.role,
                canView: true,
                canEdit: ['owner', 'admin', 'member'].includes(member.role),
                canManage: ['owner', 'admin'].includes(member.role),
                canCreateProject: ['owner', 'admin'].includes(member.role),
                canCreateTask: ['owner', 'admin'].includes(member.role)
            };
        } catch (error) {
            console.error('Error checking workspace permissions:', error);
            return { canView: false, canEdit: false, canManage: false, role: null };
        }
    }

    async getProjectPermissions(projectId, userId) {
        try {
            const project = await Project.findById(projectId).populate('workspace');
            if (!project) return { canView: false, canEdit: false, canManage: false, role: null };

            const workspaceId = project.workspace?._id || project.workspace || null;
            const wsPerms = workspaceId
                ? await this.getWorkspacePermissions(workspaceId, userId)
                : { canCreateTask: false, canManage: false, role: null };
            const isWorkspaceOwner = wsPerms.role === 'owner';

            if (String(project.owner) === String(userId)) {
                return {
                    canView: true,
                    canEdit: true,
                    canManage: true,
                    role: 'owner',
                    canCreateTask: true,
                    isProjectAdmin: true
                };
            }

            const projectMember = project.members.find(m => String(m.user) === String(userId));
            if (projectMember) {
                const isProjectLevelAdmin = projectMember.role === 'admin';
                return {
                    role: projectMember.role,
                    canView: true,
                    canEdit: ['admin', 'member'].includes(projectMember.role),
                    canManage: isProjectLevelAdmin,
                    canCreateTask: isProjectLevelAdmin || isWorkspaceOwner,
                    isProjectAdmin: isProjectLevelAdmin
                };
            }

            if (project.workspace) {
                if (wsPerms.canManage) {
                    return {
                        role: wsPerms.role,
                        canView: true,
                        canEdit: true,
                        canManage: true,
                        canCreateTask: isWorkspaceOwner,
                        isProjectAdmin: false,
                        inheritedFromWorkspace: true
                    };
                }
            }
            return { canView: false, canEdit: false, canManage: false, role: null };
        } catch (error) {
            console.error('Error checking project permissions:', error);
            return { canView: false, canEdit: false, canManage: false, role: null };
        }
    }

    async getTaskPermissions(taskId, userId) {
        try {
            const task = await Task.findById(taskId).populate('workspace').populate('project');
            if (!task) return { canView: false, canEdit: false, canManage: false, role: null };

            if (String(task.createdBy) === String(userId)) {
                return { canView: true, canEdit: true, canManage: true, role: 'creator', canCreateSubtask: true };
            }

            const isAssignee = task.assignees?.some(assigneeId => String(assigneeId) === String(userId));
            if (isAssignee) {
                return { role: 'assignee', canView: true, canEdit: true, canManage: false, canCreateSubtask: true };
            }

            if (task.project) {
                const projPerms = await this.getProjectPermissions(task.project._id, userId);
                if (projPerms.canEdit) return { ...projPerms, canCreateSubtask: true, inheritedFromProject: true };
            }

            if (task.workspace) {
                const wsPerms = await this.getWorkspacePermissions(task.workspace._id, userId);
                if (wsPerms.canEdit) return { ...wsPerms, canCreateSubtask: true, inheritedFromWorkspace: true };
            }

            return { canView: false, canEdit: false, canManage: false, role: null };
        } catch (error) {
            console.error('Error checking task permissions:', error);
            return { canView: false, canEdit: false, canManage: false, role: null };
        }
    }

    async getUserPermissionsForTimeline(userId) {
        try {
            const memberships = await WorkspaceMember.find({ user: userId }).populate('workspace').lean();
            const createdWorkspaces = await Workspace.find({ createdBy: userId }).lean();
            const membershipWorkspaceIds = memberships
                .map((membership) => membership.workspace?._id || membership.workspace)
                .filter(Boolean)
                .map((id) => String(id));
            const createdWorkspaceIds = createdWorkspaces.map((workspace) => String(workspace._id));
            const accessibleWorkspaceIds = Array.from(new Set([
                ...membershipWorkspaceIds,
                ...createdWorkspaceIds
            ]));

            const projects = await Project.find({
                $or: [
                    { workspace: { $in: accessibleWorkspaceIds } },
                    { owner: userId },
                    { 'members.user': userId }
                ]
            }).populate('workspace').lean();
            const tasks = await Task.find({ $or: [{ createdBy: userId }, { assignees: userId }] }).lean();

            const permissions = { workspaces: {}, projects: {}, tasks: {} };

            // FIX: Added null check for m.workspace
            memberships.forEach(m => {
                if (!m.workspace) return;
                const wsId = String(m.workspace._id);
                permissions.workspaces[wsId] = {
                    role: m.role,
                    canCreateProject: ['owner', 'admin'].includes(m.role),
                    canCreateTask: ['owner', 'admin'].includes(m.role)
                };
            });

            createdWorkspaces.forEach(ws => {
                const wsId = String(ws._id);
                permissions.workspaces[wsId] = { role: 'owner', canCreateProject: true, canCreateTask: true };
            });

            const workspacePermissionLookup = { ...permissions.workspaces };

            projects.forEach(p => {
                const projId = String(p._id);
                const isOwner = String(p.owner) === String(userId);
                const workspaceId = String(p.workspace?._id || p.workspace || "");
                const wsPerms = workspaceId ? workspacePermissionLookup[workspaceId] : null;
                const workspaceRole = wsPerms?.role || null;
                const isWorkspaceOwner = workspaceRole === 'owner';

                if (isOwner) {
                    permissions.projects[projId] = {
                        role: 'owner',
                        canCreateTask: true,
                        isProjectAdmin: true
                    };
                } else {
                    const member = p.members.find(m => String(m.user) === String(userId));
                    if (member) {
                        const isProjectLevelAdmin = member.role === 'admin';
                        permissions.projects[projId] = {
                            role: member.role,
                            canCreateTask: isProjectLevelAdmin || isWorkspaceOwner,
                            isProjectAdmin: isProjectLevelAdmin
                        };
                    } else if (wsPerms) {
                        permissions.projects[projId] = {
                            role: workspaceRole,
                            canCreateTask: isWorkspaceOwner,
                            isProjectAdmin: false,
                            inheritedFromWorkspace: true
                        };
                    }
                }
            });

            tasks.forEach(t => {
                const taskId = String(t._id);
                const isCreator = String(t.createdBy) === String(userId);
                const isAssignee = t.assignees?.some(a => String(a) === String(userId));

                permissions.tasks[taskId] = {
                    role: isCreator ? 'creator' : 'assignee',
                    canCreateSubtask: isCreator || isAssignee
                };
            });

            return permissions;
        } catch (error) {
            console.error('Error getting user permissions:', error);
            // FIX: Return empty object but log error so server doesn't crash
            return { workspaces: {}, projects: {}, tasks: {} };
        }
    }
}

module.exports = new PermissionService();
