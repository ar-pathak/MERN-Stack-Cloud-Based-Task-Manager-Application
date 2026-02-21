const Subtask = require("../models/subtasks");
const Task = require("../models/tasks");
const WorkspaceMember = require("../models/workspaceMember");
const Project = require("../models/project");
const Team = require("../models/team");

const canViewSubtask = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { subtaskId, taskId } = req.params;

        let subtask = null;
        let task = null;

        if (subtaskId) {
            subtask = await Subtask.findById(subtaskId).select("createdBy assignedTo task");
            if (!subtask) {
                return res.status(404).json({ message: "Subtask not found" });
            }
            task = await Task.findById(subtask.task).select("createdBy assignees assigneesTeams workspace project");
        } else if (taskId) {
            task = await Task.findById(taskId).select("createdBy assignees assigneesTeams workspace project");
        }

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const isDirectTaskMember =
            String(task.createdBy) === String(userId) ||
            task.assignees?.some((id) => String(id) === String(userId));

        const isSubtaskMember = subtask
            ? String(subtask.createdBy) === String(userId) ||
            subtask.assignedTo?.some((id) => String(id) === String(userId))
            : false;

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

        let isWorkspaceMember = false;
        if (task.workspace) {
            const workspaceMember = await WorkspaceMember.findOne({
                workspace: task.workspace,
                user: userId
            }).select("_id");
            isWorkspaceMember = Boolean(workspaceMember);
        }

        let isProjectMember = false;
        if (task.project) {
            const project = await Project.findById(task.project).select("owner members");
            if (project) {
                isProjectMember =
                    String(project.owner) === String(userId) ||
                    project.members.some(
                        (member) => String(member.user) === String(userId)
                    );
            }
        }

        if (isDirectTaskMember || isSubtaskMember || isTaskTeamMember || isWorkspaceMember || isProjectMember) {
            return next();
        }

        return res.status(403).json({
            message: "You do not have permission to view this subtask data"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Permission check failed" });
    }
};

module.exports = canViewSubtask;
