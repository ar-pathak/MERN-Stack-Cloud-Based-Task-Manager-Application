const express = require('express')
const authMiddleware = require('../../middleware/authMiddleware')
const {checkWorkspaceMemberRole} = require('../../middleware/checkRoleMiddleware')
const teamController = require('./teams.controller')

const router = express.Router()

router.use(authMiddleware)

// Define team-related routes here

router.post('/workspaces/:workspaceId/teams', checkWorkspaceMemberRole("owner", "admin"), teamController.createTeam);
router.get('/workspaces/:workspaceId/teams', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), teamController.getTeamsByWorkspace);
router.get('/workspaces/:workspaceId/team/:teamId', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), teamController.getTeamById);
router.patch('/workspaces/:workspaceId/team/:teamId', checkWorkspaceMemberRole("owner", "admin"), teamController.updateTeam);
router.delete('/workspaces/:workspaceId/team/:teamId', checkWorkspaceMemberRole("owner", "admin"), teamController.deleteTeam);

// Team member management routes
router.post('/workspaces/:workspaceId/team/:teamId/members', checkWorkspaceMemberRole("owner", "admin"), teamController.addTeamMember);
router.get('/workspaces/:workspaceId/team/:teamId/members', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), teamController.getTeamMembers);
router.delete('/workspaces/:workspaceId/team/:teamId/member/:memberId', checkWorkspaceMemberRole("owner", "admin"), teamController.removeTeamMember);
router.patch('/workspaces/:workspaceId/team/:teamId/member/:memberId/role', checkWorkspaceMemberRole("owner", "admin"), teamController.updateTeamMemberRole);


module.exports = router