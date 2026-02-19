const Project = require('../../models/project');
const Task = require('../../models/tasks');
const Team = require('../../models/team');
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
            const isWorkspaceManager = ['owner', 'admin'].includes(String(wsPerms.role || ''));

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
                    canManage: isProjectLevelAdmin || isWorkspaceManager,
                    canCreateTask: isProjectLevelAdmin || isWorkspaceManager,
                    isProjectAdmin: isProjectLevelAdmin
                };
            }

            if (isWorkspaceManager) {
                return {
                    role: wsPerms.role,
                    canView: true,
                    canEdit: true,
                    canManage: true,
                    canCreateTask: true,
                    isProjectAdmin: false,
                    inheritedFromWorkspace: true
                };
            }

            const teamMembership = await Team.findOne({
                _id: { $in: project.teams || [] },
                "members.user": userId
            })
                .select("members")
                .lean();

            if (teamMembership) {
                const teamMember = teamMembership.members.find(
                    (entry) => String(entry.user) === String(userId)
                );
                const teamRole = String(teamMember?.role || "member");

                return {
                    role: teamRole,
                    canView: true,
                    canEdit: false,
                    canManage: false,
                    canCreateTask: teamRole === "lead",
                    isProjectAdmin: false,
                    inheritedFromTeam: true
                };
            }

            if (wsPerms.canView) {
                return {
                    role: "viewer",
                    canView: true,
                    canEdit: false,
                    canManage: false,
                    canCreateTask: false,
                    isProjectAdmin: false,
                    inheritedFromWorkspace: true
                };
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

            const teamMembership = await Team.findOne({
                _id: { $in: task.assigneesTeams || [] },
                "members.user": userId
            })
                .select("members")
                .lean();

            if (teamMembership) {
                const teamMember = teamMembership.members.find(
                    (entry) => String(entry.user) === String(userId)
                );
                return {
                    role: teamMember?.role || 'member',
                    canView: true,
                    canEdit: true,
                    canManage: false,
                    canCreateSubtask: true,
                    inheritedFromTeam: true
                };
            }

            if (task.project) {
                const projPerms = await this.getProjectPermissions(task.project._id, userId);
                const projectAdminAccess = projPerms.isProjectAdmin
                    || ['owner', 'admin'].includes(String(projPerms.role || ''));
                if (projectAdminAccess) {
                    return { ...projPerms, canCreateSubtask: true, inheritedFromProject: true };
                }
            }

            if (task.workspace) {
                const wsPerms = await this.getWorkspacePermissions(task.workspace._id, userId);
                if (['owner', 'admin'].includes(String(wsPerms.role || ''))) {
                    return { ...wsPerms, canCreateSubtask: true, inheritedFromWorkspace: true };
                }
            }

            return { canView: false, canEdit: false, canManage: false, role: null };
        } catch (error) {
            console.error('Error checking task permissions:', error);
            return { canView: false, canEdit: false, canManage: false, role: null };
        }
    }

    async getUserPermissionsForTimeline(userId) {
        try {
            const [memberships, createdWorkspaces, userTeams] = await Promise.all([
                WorkspaceMember.find({ user: userId }).populate('workspace').lean(),
                Workspace.find({ createdBy: userId }).lean(),
                Team.find({ "members.user": userId }).select("_id members").lean()
            ]);

            const membershipWorkspaceIds = memberships
                .map((membership) => membership.workspace?._id || membership.workspace)
                .filter(Boolean)
                .map((id) => String(id));
            const createdWorkspaceIds = createdWorkspaces.map((workspace) => String(workspace._id));
            const userTeamIds = userTeams.map((team) => String(team._id));
            const userTeamRoleById = new Map(
                userTeams.map((team) => {
                    const teamMember = (team.members || []).find(
                        (member) => String(member.user) === String(userId)
                    );
                    return [String(team._id), String(teamMember?.role || "member")];
                })
            );

            const accessibleWorkspaceIds = Array.from(new Set([
                ...membershipWorkspaceIds,
                ...createdWorkspaceIds
            ]));

            const projectFilters = [
                { workspace: { $in: accessibleWorkspaceIds } },
                { owner: userId },
                { 'members.user': userId }
            ];
            if (userTeamIds.length) {
                projectFilters.push({ teams: { $in: userTeamIds } });
            }

            const taskFilters = [
                { createdBy: userId },
                { assignees: userId }
            ];
            if (userTeamIds.length) {
                taskFilters.push({ assigneesTeams: { $in: userTeamIds } });
            }

            const [projects, tasks] = await Promise.all([
                Project.find({ $or: projectFilters }).populate('workspace').lean(),
                Task.find({ $or: taskFilters }).lean()
            ]);

            const permissions = { workspaces: {}, projects: {}, tasks: {} };

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
                const isWorkspaceManager = ['owner', 'admin'].includes(String(workspaceRole || ''));

                if (isOwner) {
                    permissions.projects[projId] = {
                        role: 'owner',
                        canEdit: true,
                        canCreateTask: true,
                        isProjectAdmin: true
                    };
                } else {
                    const member = p.members.find(m => String(m.user) === String(userId));
                    if (member) {
                        const isProjectLevelAdmin = member.role === 'admin';
                        permissions.projects[projId] = {
                            role: member.role,
                            canEdit: ['admin', 'member'].includes(member.role),
                            canCreateTask: isProjectLevelAdmin || isWorkspaceManager,
                            isProjectAdmin: isProjectLevelAdmin
                        };
                    } else if (isWorkspaceManager) {
                        permissions.projects[projId] = {
                            role: workspaceRole,
                            canEdit: true,
                            canCreateTask: true,
                            isProjectAdmin: false,
                            inheritedFromWorkspace: true
                        };
                    } else {
                        const teamRoles = (p.teams || [])
                            .map((teamId) => userTeamRoleById.get(String(teamId)))
                            .filter(Boolean);

                        if (teamRoles.length) {
                            const teamRole = teamRoles.includes("lead") ? "lead" : "member";
                            permissions.projects[projId] = {
                                role: teamRole,
                                canEdit: false,
                                canCreateTask: teamRole === "lead",
                                isProjectAdmin: false,
                                inheritedFromTeam: true
                            };
                        } else if (wsPerms) {
                            permissions.projects[projId] = {
                                role: 'viewer',
                                canEdit: false,
                                canCreateTask: false,
                                isProjectAdmin: false,
                                inheritedFromWorkspace: true
                            };
                        }
                    }
                }
            });

            tasks.forEach(t => {
                const taskId = String(t._id);
                const isCreator = String(t.createdBy) === String(userId);
                const isAssignee = t.assignees?.some(a => String(a) === String(userId));
                const teamRoles = (t.assigneesTeams || [])
                    .map((teamId) => userTeamRoleById.get(String(teamId)))
                    .filter(Boolean);
                const teamRole = teamRoles.length
                    ? (teamRoles.includes("lead") ? "lead" : "member")
                    : null;

                let role = null;
                if (isCreator) {
                    role = 'creator';
                } else if (isAssignee) {
                    role = 'assignee';
                } else if (teamRole) {
                    role = teamRole;
                }

                permissions.tasks[taskId] = {
                    role,
                    canCreateSubtask: Boolean(role),
                    canChangeStatus: isCreator || isAssignee || Boolean(teamRole),
                    canUpdateTask: isCreator,
                    canUpdatePriority: isCreator,
                    inheritedFromTeam: Boolean(teamRole && !isCreator && !isAssignee)
                };
            });

            return permissions;
        } catch (error) {
            console.error('Error getting user permissions:', error);
            return { workspaces: {}, projects: {}, tasks: {} };
        }
    }
}

module.exports = new PermissionService();
