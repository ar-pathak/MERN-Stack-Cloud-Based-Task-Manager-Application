const Subtask = require("../models/subtasks");
const Task = require("../models/tasks");
const Workspace = require("../models/workspace");
const Project = require("../models/project");

const canModifySubtask = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { subtaskId } = req.params;

        const subtask = await Subtask.findById(subtaskId).populate({
            path: 'task',
            populate: [
                { path: 'workspace' },
                { path: 'project' }
                
            ]
        });

        if (!subtask) {
            return res.status(404).json({ message: "Subtask not found" });
        }

        const task = subtask.task;

        // Check if user is task owner or assignee
        const isTaskOwner =
            String(task.createdBy) === String(userId) ||
            task.assignees?.some(id => String(id) === String(userId));

        // Check if user is subtask creator or assigned to
        const isSubtaskOwner =
            String(subtask.createdBy) === String(userId) ||
            (subtask.assignedTo && String(subtask.assignedTo) === String(userId));

        // Check workspace permission
        let hasWorkspacePermission = false;
        if (task.workspace) {
            const ws = await Workspace.findById(task.workspace);
            if (ws && String(ws.createdBy) === String(userId)) {
                hasWorkspacePermission = true;
            }
        }

        // Check project permission
        let hasProjectPermission = false;
        if (task.project) {
            const project = await Project.findById(task.project);
            if (project) {
                if (String(project.owner) === String(userId)) {
                    hasProjectPermission = true;
                } else {
                    hasProjectPermission = project.members.some(
                        m => String(m.user) === String(userId) && m.role !== "viewer"
                    );
                }
            }
        }

        if (isTaskOwner || isSubtaskOwner || hasWorkspacePermission || hasProjectPermission) {
            return next();
        }

        return res.status(403).json({
            message: "You do not have permission to modify this subtask"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Permission check failed" });
    }
};

module.exports = canModifySubtask;