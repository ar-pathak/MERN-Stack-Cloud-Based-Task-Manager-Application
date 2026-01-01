const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware')
const checkRoleMiddleware = require('../../middleware/checkRoleMiddleware')
const projectController = require('./project.controller');


const router = express.Router();

router.use(authMiddleware);

router.post('/workspaces/:workspaceId/projects', checkRoleMiddleware(['admin', 'editor']), projectController.createProject);
router.get('/workspaces/:workspaceId/projects',checkRoleMiddleware("owner", "admin", "member", "viewer"), projectController.getProjectsByWorkspace);
router.get('/workspaces/:workspaceId/projects/:projectId',checkRoleMiddleware("owner", "admin", "member", "viewer"), projectController.getProjectById);
router.patch('/workspaces/:workspaceId/projects/:projectId', checkRoleMiddleware("owner", "admin", "member", "viewer"), projectController.updateProject);
router.delete('/workspaces/:workspaceId/projects/:projectId', checkRoleMiddleware('admin'),projectController.deleteProject);



module.exports = router;
