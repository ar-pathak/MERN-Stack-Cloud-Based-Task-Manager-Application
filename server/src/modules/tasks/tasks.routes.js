const express = require('express')
const authMiddleware = require('../../middleware/authMiddleware');
const taskController = require('./tasks.controller');
const { checkWorkspaceMemberRole, checkCanCreateTask } = require('../../middleware/checkRoleMiddleware');
const router = express.Router()

router.use(authMiddleware);

//creating task at global level
router.post('/createTasksAtGlobalLevel', taskController.createTaskAtGlobalLevel)

//creating task at workspace level
router.post('/workspace/:workspaceId/createTasksAtWorkspaceLevel', checkCanCreateTask(), taskController.createTaskAtWorkspaceLevel)

//creating task at project level
router.post('/workspace/:workspaceId/project/:projectId/createTasksAtProjectLevel', checkCanCreateTask(), taskController.createTaskAtProjectLevel)

//update task
router.patch('/:taskId/update', taskController.updateTask)

//add assignees to task
router.patch('/:taskId/assignees/add', taskController.addTaskAssignees)
router.post('/:taskId/assignees/requests/:requestId/respond', taskController.respondTaskAssigneeRequest)

//remove assignees to task
router.delete('/:taskId/assignees/remove', taskController.removeTaskAssignees)

//change status of task
router.patch('/:taskId/status', taskController.changeTaskStatus)
router.patch('/:taskId/toggle', taskController.toggleTaskCompletion)

//soft delete tasks
router.delete('/:taskId/softDelete', taskController.deleteTask)

//restore tasks
router.patch('/:taskId/restore', taskController.restoreTask)

//permanently delete tasks
router.delete('/:taskId/permanentDelete', taskController.permanentDeleteTask)

//get global level tasks
router.get('/getAllGlobalLevelTasks', taskController.getAllGlobalLevelTasks)

//get task by ID
router.get('/:taskId', taskController.getTask)

//get all tasks by workspace
router.get('/workspaces/:workspaceId/tasks', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), taskController.getTasksByWorkspace)

//get all tasks by project
router.get('/workspaces/:workspaceId/projects/:projectId/tasks', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), taskController.getTasksByProject)

//leave task
router.post('/:taskId/leave', taskController.leaveTask);

module.exports = router;
