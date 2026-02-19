const WorkspaceMember = require("../models/workspaceMember");
const Project = require("../models/project");
const Team = require("../models/team");

const isWorkspaceAdminOrOwner = (role = "") =>
    ["owner", "admin"].includes(String(role));

const uniqueIdStrings = (values = []) => {
    const set = new Set();
    values.forEach((value) => {
        if (!value) return;
        const id = String(value);
        if (id) set.add(id);
    });
    return Array.from(set);
};

const canCreateTask = async ({
    userId,
    workspaceId = null,
    projectId = null,
    teamId = null,
    teamIds = [],
    enforceWorkspaceAdminOnly = false,
    requireProjectAdminOrWorkspaceOwner = false
}) => {
    const workspaceMember = workspaceId
        ? await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: userId
        }).select("role")
        : null;

    const requestedTeamIds = uniqueIdStrings([
        ...(Array.isArray(teamIds) ? teamIds : []),
        teamId
    ]);

    // Project-level checks.
    if (projectId) {
        const project = await Project.findById(projectId)
            .select("workspace owner members teams")
            .lean();

        if (!project) {
            return false;
        }

        if (workspaceId && String(project.workspace) !== String(workspaceId)) {
            return false;
        }

        if (requireProjectAdminOrWorkspaceOwner) {
            let scopedWorkspaceMember = workspaceMember;

            if (!scopedWorkspaceMember || String(project.workspace) !== String(workspaceId || "")) {
                scopedWorkspaceMember = await WorkspaceMember.findOne({
                    workspace: project.workspace,
                    user: userId
                }).select("role");
            }

            const workspaceRole = String(scopedWorkspaceMember?.role || "");
            const isWorkspaceManager = isWorkspaceAdminOrOwner(workspaceRole);
            if (isWorkspaceManager) {
                return true;
            }

            if (String(project.owner) === String(userId)) {
                return true;
            }

            const projectMember = project.members.find((member) => String(member.user) === String(userId));
            if (projectMember?.role === "admin") {
                return true;
            }

            const projectTeamIds = uniqueIdStrings(project.teams || []);
            const scopedTeamIds = requestedTeamIds.length
                ? requestedTeamIds.filter((id) => projectTeamIds.includes(id))
                : projectTeamIds;

            if (!scopedTeamIds.length) {
                return false;
            }

            const leadTeam = await Team.findOne({
                _id: { $in: scopedTeamIds },
                members: {
                    $elemMatch: {
                        user: userId,
                        role: "lead"
                    }
                }
            })
                .select("_id")
                .lean();

            return Boolean(leadTeam);
        }

        if (enforceWorkspaceAdminOnly) {
            if (workspaceMember) {
                return isWorkspaceAdminOrOwner(workspaceMember.role);
            }

            const scopedWorkspaceMember = await WorkspaceMember.findOne({
                workspace: project.workspace,
                user: userId
            }).select("role");

            return isWorkspaceAdminOrOwner(scopedWorkspaceMember?.role);
        }

        const projectTeamIds = uniqueIdStrings(project.teams || []);
        const scopedTeamIds = requestedTeamIds.length
            ? requestedTeamIds.filter((id) => projectTeamIds.includes(id))
            : projectTeamIds;

        let isAssignedTeamLead = false;
        if (scopedTeamIds.length) {
            const leadTeam = await Team.findOne({
                _id: { $in: scopedTeamIds },
                members: {
                    $elemMatch: {
                        user: userId,
                        role: "lead"
                    }
                }
            })
                .select("_id")
                .lean();
            isAssignedTeamLead = Boolean(leadTeam);
        }

        if (String(project.owner) === String(userId)) {
            return true;
        }

        const member = project.members.find((m) => String(m.user) === String(userId));
        if (scopedTeamIds.length) {
            if (isAssignedTeamLead) {
                return true;
            }
            return member?.role === "admin";
        }

        if (member) {
            return ["admin", "member"].includes(member.role);
        }

        return !!(workspaceMember && ["owner", "admin"].includes(workspaceMember.role));
    }

    // Workspace-level checks.
    if (workspaceMember) {
        if (enforceWorkspaceAdminOnly) {
            return isWorkspaceAdminOrOwner(workspaceMember.role);
        }

        return ["owner", "admin", "member"].includes(workspaceMember.role);
    }

    // Team-level checks.
    if (requestedTeamIds.length) {
        const team = await Team.findOne({
            _id: { $in: requestedTeamIds },
            "members.user": userId
        }).lean();

        if (!team) {
            return false;
        }

        const member = team.members.find((m) => String(m.user) === String(userId));
        return member?.role === "lead";
    }

    return false;
};

module.exports = { canCreateTask };
