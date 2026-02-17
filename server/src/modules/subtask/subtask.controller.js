const subtaskService = require("./subtask.service");



const subtaskController = {
    /**
     * Create a new subtask
     * POST /api/subtasks/createSubtask
     */
    createSubtask: async (req, res) => {
        try {
            const { taskId, title, description, assignedTo, dueDate } = req.body;
            const userId = req.user.id || req.user._id;

            const subtask = await subtaskService.createSubtask({
                taskId,
                title,
                description,
                assignedTo,
                dueDate,
                createdBy: userId
            });

            res.status(201).json({
                success: true,
                message: 'Subtask created successfully',
                data: subtask
            });
        } catch (error) {
            console.error('Create subtask error:', error);
            res.status(error.message === 'Task not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to create subtask'
            });
        }
    },
    /**
     * Get all subtasks for a task
     * GET /api/subtasks/task/:taskId
     */
    getSubtasksByTask: async (req, res) => {
        try {
            const { taskId } = req.params;
            const subtasks = await subtaskService.getSubtasksByTask(taskId);

            res.status(200).json({
                success: true,
                count: subtasks.length,
                data: subtasks
            });
        } catch (error) {
            console.error('Get subtasks error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch subtasks'
            });
        }
    },


    /**
     * Get a single subtask
     * GET /api/subtasks/:subtaskId
     */
    getSubtask: async (req, res) => {
        try {
            const { subtaskId } = req.params;
            const subtask = await subtaskService.getSubtaskById(subtaskId);

            res.status(200).json({
                success: true,
                data: subtask
            });
        } catch (error) {
            console.error('Get subtask error:', error);
            res.status(error.message === 'Subtask not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to fetch subtask'
            });
        }
    },
    /**
     * Update a subtask
     * PATCH /api/subtasks/:subtaskId
     */
    updateSubtask: async (req, res) => {
        try {
            const { subtaskId } = req.params;
            const updates = req.body;
            const userId = req.user.id || req.user._id;

            const subtask = await subtaskService.updateSubtask(subtaskId, updates, userId);

            res.status(200).json({
                success: true,
                message: 'Subtask updated successfully',
                data: subtask
            });
        } catch (error) {
            console.error('Update subtask error:', error);
            res.status(error.message === 'Subtask not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to update subtask'
            });
        }
    },

    /**
     * Toggle subtask completion
     * PATCH /api/subtasks/:subtaskId/toggle
     */
    toggleSubtask: async (req, res) => {
        try {
            const { subtaskId } = req.params;
            const userId = req.user.id || req.user._id;

            const subtask = await subtaskService.toggleSubtask(subtaskId, userId);

            res.status(200).json({
                success: true,
                message: `Subtask ${subtask.completed ? 'completed' : 'reopened'} successfully`,
                data: subtask
            });
        } catch (error) {
            console.error('Toggle subtask error:', error);
            res.status(error.message === 'Subtask not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to toggle subtask'
            });
        }
    },

    /**
     * Delete a subtask
     * DELETE /api/subtasks/:subtaskId
     */
    deleteSubtask: async (req, res) => {
        try {
            const { subtaskId } = req.params;
            const userId = req.user.id || req.user._id;
            const result = await subtaskService.deleteSubtask(subtaskId, userId);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Delete subtask error:', error);
            res.status(error.message === 'Subtask not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to delete subtask'
            });
        }
    },

    /**
     * Reorder subtasks
     * PUT /api/subtasks/task/:taskId/reorder
     */
    reorderSubtasks: async (req, res) => {
        try {
            const { taskId } = req.params;
            const { subtaskIds } = req.body;

            if (!Array.isArray(subtaskIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'subtaskIds must be an array'
                });
            }

            const subtasks = await subtaskService.reorderSubtasksManual(taskId, subtaskIds);

            res.status(200).json({
                success: true,
                message: 'Subtasks reordered successfully',
                data: subtasks
            });
        } catch (error) {
            console.error('Reorder subtasks error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to reorder subtasks'
            });
        }
    },

    /**
     * Get subtask statistics
     * GET /api/subtasks/task/:taskId/stats
     */
    getSubtaskStats: async (req, res) => {
        try {
            const { taskId } = req.params;
            const stats = await subtaskService.getSubtaskStats(taskId);

            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get subtask stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch subtask statistics'
            });
        }
    },

    /**
     * Add assignees
     * PATCH /api/subtasks/:subtaskId/assignees/add
     */
    addAssignees: async (req, res) => {
        try {
            const { subtaskId } = req.params;
            const { assignees } = req.body; // Array of IDs validated by middleware
            const userId = req.user.id || req.user._id;

            const subtask = await subtaskService.addAssignees(subtaskId, assignees, userId);

            res.status(200).json({
                success: true,
                message: 'Assignees added successfully',
                data: subtask
            });
        } catch (error) {
            res.status(error.message === 'Subtask not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to add assignees'
            });
        }
    },

    /**
     * Remove assignees
     * DELETE /api/subtasks/:subtaskId/assignees/remove
     */
    removeAssignees: async (req, res) => {
        try {
            const { subtaskId } = req.params;
            const { assignees } = req.body;
            const userId = req.user.id || req.user._id;

            const subtask = await subtaskService.removeAssignees(subtaskId, assignees, userId);

            res.status(200).json({
                success: true,
                message: 'Assignees removed successfully',
                data: subtask
            });
        } catch (error) {
            res.status(error.message === 'Subtask not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to remove assignees'
            });
        }
    },


    /**
     * Leave subtask
     * POST /api/subtasks/:subtaskId/leave
     */
    leaveSubtask: async (req, res) => {
        try {
            const { subtaskId } = req.params;
            const userId = req.user.id || req.user._id; // From Auth Middleware

            await subtaskService.leaveSubtask(subtaskId, userId);

            res.status(200).json({
                success: true,
                message: 'Left subtask successfully'
            });
        } catch (error) {
            console.error('Leave subtask error:', error);
            res.status(error.message === 'Subtask not found' ? 404 : 400).json({
                success: false,
                message: error.message || 'Failed to leave subtask'
            });
        }
    }
}

module.exports = subtaskController;
