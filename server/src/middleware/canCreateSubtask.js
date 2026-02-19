const WorkspaceMember = require("../models/workspaceMember");
const Project = require("../models/project");
const Task = require("../models/tasks");
const Team = require("../models/team");

const canCreateSubtask = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { taskId } = req.body;

        const task = await Task.findById(taskId).select("createdBy assignees assigneesTeams workspace project");
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const isDirectTaskMember =
            String(task.createdBy) === String(userId) ||
            task.assignees?.some((id) => String(id) === String(userId));

        let isTaskTeamMember = false;
        if (task.assigneesTeams?.length) {
            const teamMembership = await Team.findOne({
                _id: { $in: task.assigneesTeams },
                "members.user": userId
            })
                .select("_id")
                .lean();
            isTaskTeamMember = Boolean(teamMembership);
        }

        let isWorkspaceOwnerOrAdmin = false;
        if (task.workspace) {
            const workspaceMember = await WorkspaceMember.findOne({
                workspace: task.workspace,
                user: userId
            }).select("role");
            isWorkspaceOwnerOrAdmin = !!workspaceMember && ["owner", "admin"].includes(workspaceMember.role);
        }

        let isProjectAdmin = false;
        if (task.project) {
            const project = await Project.findById(task.project).select("owner members");
            if (project) {
                isProjectAdmin =
                    String(project.owner) === String(userId) ||
                    project.members.some(
                        (member) =>
                            String(member.user) === String(userId) &&
                            member.role === "admin"
                    );
            }
        }

        if (isDirectTaskMember || isTaskTeamMember || isWorkspaceOwnerOrAdmin || isProjectAdmin) {
            return next();
        }

        return res.status(403).json({
            message: "Only task members, task team members, workspace owners/admins, or project admins can create subtasks"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Permission check failed" });
    }
};

module.exports = canCreateSubtask;
