const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const canCreateSubtask = require('../../middleware/canCreateSubtask');
const canModifySubtask = require('../../middleware/canModifySubtask');
const { validateCreateSubtask, validateUpdateSubtask } = require('./subtask.validation');
const subtaskController = require('./subtask.controller');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create subtask
router.post(
    '/createSubtask', 
    validateCreateSubtask,
    canCreateSubtask,
    subtaskController.createSubtask
);

// Get all subtasks for a task
router.get(
    '/task/:taskId',
    subtaskController.getSubtasksByTask
);

// Get subtask statistics
router.get(
    '/task/:taskId/stats',
    subtaskController.getSubtaskStats
);

// Reorder subtasks
router.put(
    '/task/:taskId/reorder',
    canModifySubtask,
    subtaskController.reorderSubtasks
);

// Get single subtask
router.get(
    '/:subtaskId',
    subtaskController.getSubtask
);

// Update subtask
router.patch(
    '/:subtaskId',
    validateUpdateSubtask,
    canModifySubtask,
    subtaskController.updateSubtask
);

// Toggle subtask completion
router.patch(
    '/:subtaskId/toggle',
    canModifySubtask,
    subtaskController.toggleSubtask
);

// Delete subtask
router.delete(
    '/:subtaskId',
    canModifySubtask,
    subtaskController.deleteSubtask
);

module.exports = router;