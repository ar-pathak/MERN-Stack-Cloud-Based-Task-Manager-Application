const WorkspaceMember = require("../models/workspaceMember");
const Project = require("../models/project");
const Team = require("../models/team");

const isWorkspaceAdminOrOwner = (role = "") =>
    ["owner", "admin"].includes(String(role));

const canCreateTask = async ({
    userId,
    workspaceId = null,
    projectId = null,
    teamId = null,
    enforceWorkspaceAdminOnly = false
}) => {
    const workspaceMember = workspaceId
        ? await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: userId
        }).select("role")
        : null;

    // Project-level checks.
    if (projectId) {
        const project = await Project.findById(projectId)
            .select("workspace owner members")
            .lean();

        if (!project) {
            return false;
        }

        if (workspaceId && String(project.workspace) !== String(workspaceId)) {
            return false;
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

        if (String(project.owner) === String(userId)) {
            return true;
        }

        const member = project.members.find((m) => String(m.user) === String(userId));
        if (teamId) {
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
    if (teamId) {
        const team = await Team.findOne({
            _id: teamId,
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
