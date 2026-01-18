const Workspace = require("../models/workspace");
const Project = require("../models/project");
const Task = require("../models/tasks");

const canCreateSubtask = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { taskId } = req.body;

        const task = await Task.findById(taskId)
            .populate("workspace")
            .populate("project");

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        /**
         * Case 1: Task -> Subtask 
         */
        const isTaskOwner =
            String(task.createdBy) === String(userId) ||
            task.assignees?.some(id => String(id) === String(userId));

        /**
         * Case 2: Workspace -> Task -> Subtask
         */
        let isWorkspaceOwner = false;
        if (task.workspace) {
            const ws = await Workspace.findById(task.workspace);
            if (ws && String(ws.createdBy) === String(userId)) {
                isWorkspaceOwner = true;
            }
        }

        /**
         * Case 3: Workspace -> Project -> Task -> Subtask
         */
        let isProjectMember = false;
        if (task.project) {
            const project = await Project.findById(task.project);
            if (project) {
                if (String(project.owner) === String(userId)) {
                    isProjectMember = true;
                } else {
                    isProjectMember = project.members.some(
                        m => String(m.user) === String(userId) && m.role !== "viewer"
                    );
                }
            }
        }

        if (isTaskOwner || isWorkspaceOwner || isProjectMember) {
            return next();
        }

        return res.status(403).json({
            message: "You do not have permission to create subtask here"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Permission check failed" });
    }
};

module.exports = canCreateSubtask;
