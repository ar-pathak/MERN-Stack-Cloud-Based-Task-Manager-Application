const express = require('express')
const authMiddleware = require('../../middleware/authMiddleware');
const taskController = require('./tasks.controller');
const { checkWorkspaceMemberRole, checkProjectMemberRole, checkTeamMemberRole, checkCanCreateTask } = require('../../middleware/checkRoleMiddleware');
const router = express.Router()

router.use(authMiddleware);

//creating task at global level
router.post('/createTasksAtGlobalLevel', taskController.createTaskAtGlobalLevel)
//creating task at workspace level
router.post('/workspace/:workspaceId/createTasksAtWorkspaceLevel', checkCanCreateTask(), taskController.createTaskAtWorkspaceLevel)

//creating task at project level
router.post('/workspace/:workspaceId/project/:projectId/createTasksAtProjectLevel', checkCanCreateTask(), taskController.createTaskAtProjectLevel)

//creating task at team level
router.post('/workspace/:workspaceId/team/:teamId/createTasksAtTeamLevel', checkCanCreateTask(), taskController.createTaskAtTeamLevel)

//add assignees to task
router.patch('/:taskId/assignees/add', taskController.addTaskAssignees)

//remove assignees to task
router.delete('/:taskId/assignees/remove', taskController.removeTaskAssignees)

//change status of task
router.patch('/:taskId/status', taskController.changeTaskStatus)

//soft delete tasks
router.delete('/:taskId/softDelete', taskController.deleteTask)

//restore tasks
router.patch('/:taskId/restore', taskController.restoreTask)

//permanently delete tasks
router.delete('/:taskId/permanentDelete', taskController.permanentDeleteTask)

module.exports = router;