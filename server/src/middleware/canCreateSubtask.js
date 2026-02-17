const WorkspaceMember = require("../models/workspaceMember");
const Project = require("../models/project");
const Task = require("../models/tasks");

const canCreateSubtask = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { taskId } = req.body;

        const task = await Task.findById(taskId).select("createdBy assignees workspace project");
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const isTaskOwner =
            String(task.createdBy) === String(userId) ||
            task.assignees?.some((id) => String(id) === String(userId));

        let hasWorkspacePermission = false;
        if (task.workspace) {
            const workspaceMember = await WorkspaceMember.findOne({
                workspace: task.workspace,
                user: userId
            }).select("role");
            hasWorkspacePermission = !!workspaceMember && ["owner", "admin", "member"].includes(workspaceMember.role);
        }

        let hasProjectPermission = false;
        if (task.project) {
            const project = await Project.findById(task.project).select("owner members");
            if (project) {
                hasProjectPermission =
                    String(project.owner) === String(userId) ||
                    project.members.some(
                        (member) =>
                            String(member.user) === String(userId) &&
                            ["admin", "member"].includes(member.role)
                    );
            }
        }

        if (isTaskOwner || hasWorkspacePermission || hasProjectPermission) {
            return next();
        }

        return res.status(403).json({
            message: "You do not have permission to create subtasks for this task"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Permission check failed" });
    }
};

module.exports = canCreateSubtask;
