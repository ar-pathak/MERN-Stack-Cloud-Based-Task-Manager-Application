const express = require('express')
const authMiddleware = require('../../middleware/authMiddleware');
const taskController = require('./tasks.controller');
const { checkWorkspaceMemberRole, checkProjectMemberRole, checkTeamMemberRole } = require('../../middleware/checkRoleMiddleware');
const router = express.Router()

router.use(authMiddleware);

//creating task at global level
router.post('/createTasksAtGlobalLevel', taskController.createTaskAtGlobalLevel)
//creating task at workspace level
router.post('/workspace/:workspaceId/createTasksAtWorkspaceLevel', checkWorkspaceMemberRole("owner", "admin"), taskController.createTaskAtWorkspaceLevel)

//creating task at project level
router.post('/workspace/:workspaceId/project/:projectId/createTasksAtWorkspaceLevel', checkWorkspaceMemberRole("owner", "admin"),  taskController.createTaskAtWorkspaceLevel)

//creating task at team level
router.post('/workspace/:workspaceId/project/:projectId/createTasksAtWorkspaceLevel', checkWorkspaceMemberRole("owner", "admin"),  taskController.createTaskAtWorkspaceLevel)

//add assignees to task

//remove assignees to task

//change status of task

//delete tasks


module.exports = router;