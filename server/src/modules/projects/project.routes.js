const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware')
const { checkWorkspaceMemberRole } = require('../../middleware/checkRoleMiddleware')
const projectController = require('./project.controller');


const router = express.Router();

router.use(authMiddleware);

router.post('/workspaces/:workspaceId/projects', checkWorkspaceMemberRole('owner', 'admin'), projectController.createProject);
router.get('/workspaces/:workspaceId/projects', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), projectController.getProjectsByWorkspace);
router.get('/workspaces/:workspaceId/projects/:projectId', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), projectController.getProjectById);
router.patch('/workspaces/:workspaceId/projects/:projectId', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), projectController.updateProject);
router.delete('/workspaces/:workspaceId/projects/:projectId', checkWorkspaceMemberRole('owner', 'admin'), projectController.deleteProject);

router.get('/workspaces/:workspaceId/projects/:projectId/teams', checkWorkspaceMemberRole('owner', 'admin', 'member', 'viewer'), projectController.getProjectTeams)
router.patch('/workspaces/:workspaceId/projects/:projectId/teams', checkWorkspaceMemberRole('owner', 'admin'), projectController.addProjectTeams)
router.delete('/workspaces/:workspaceId/projects/:projectId/teams', checkWorkspaceMemberRole('owner', 'admin'), projectController.removeProjectTeams)

router.get('/workspaces/:workspaceId/projects/:projectId/members', checkWorkspaceMemberRole('owner', 'admin', 'member', 'viewer'), projectController.getProjectMembers)
router.patch('/workspaces/:workspaceId/projects/:projectId/members', checkWorkspaceMemberRole('owner', 'admin'), projectController.addProjectMembers)
router.delete('/workspaces/:workspaceId/projects/:projectId/members', checkWorkspaceMemberRole('owner', 'admin'), projectController.removeProjectMembers)



module.exports = router;