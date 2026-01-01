const express = require('express')
const authMiddleware = require('../../middleware/authMiddleware')
const checkRoleMiddleware = require('../../middleware/checkRoleMiddleware')
const teamController = require('./teams.controller')

const router = express.Router()

router.use(authMiddleware)

// Define team-related routes here

router.post('/workspaces/:workspaceId/teams', checkRoleMiddleware("owner", "admin"), teamController.createTeam);
router.get('/workspaces/:workspaceId/teams', checkRoleMiddleware("owner", "admin", "member", "viewer"), teamController.getTeamsByWorkspace);
router.get('/workspaces/:workspaceId/team/:teamId', checkRoleMiddleware("owner", "admin", "member", "viewer"), teamController.getTeamById);
router.patch('/workspaces/:workspaceId/team/:teamId', checkRoleMiddleware("owner", "admin"), teamController.updateTeam);
router.delete('/workspaces/:workspaceId/team/:teamId', checkRoleMiddleware("owner", "admin"), teamController.deleteTeam);

// Team member management routes
router.post('/workspaces/:workspaceId/team/:teamId/members', checkRoleMiddleware("owner", "admin"), teamController.addTeamMember);
router.get('/workspaces/:workspaceId/team/:teamId/members', checkRoleMiddleware("owner", "admin", "member", "viewer"), teamController.getTeamMembers);
router.delete('/workspaces/:workspaceId/team/:teamId/member/:memberId', checkRoleMiddleware("owner", "admin"), teamController.removeTeamMember);
router.patch('/workspaces/:workspaceId/team/:teamId/member/:memberId/role', checkRoleMiddleware("owner", "admin"), teamController.updateTeamMemberRole);


module.exports = router