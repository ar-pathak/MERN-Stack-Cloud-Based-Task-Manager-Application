const WorkspaceMember = require("../models/workspaceMember");
const Project = require("../models/project");
const Team = require("../models/team");

const canCreateTask = async ({
    userId,
    workspaceId = null,
    projectId = null,
    teamId = null
}) => {
    // 1️⃣ Workspace-level authority
    if (workspaceId) {
        const workspaceMember = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: userId
        });

        if (workspaceMember && ["owner", "admin"].includes(workspaceMember.role)) {
            return true;
        }
    }

    // 2️⃣ Project-level authority
    if (projectId) {
        const project = await Project.findOne({
            _id: projectId,
            "members.user": userId
        });

        if (!project) return false;

        const member = project.members.find(
            m => m.user.toString() === userId.toString()
        );

        if (teamId) {
            // Project admin can create in child teams
            return member.role === "admin";
        }

        // Project admin/editor can create project tasks
        return ["admin", "editor"].includes(member.role);
    }

    // 3️⃣ Team-level authority
    if (teamId) {
        const team = await Team.findOne({
            _id: teamId,
            "members.user": userId
        });

        if (!team) return false;

        const member = team.members.find(
            m => m.user.toString() === userId.toString()
        );

        return member.role === "lead";
    }

    return false;
};

module.exports = { canCreateTask };
