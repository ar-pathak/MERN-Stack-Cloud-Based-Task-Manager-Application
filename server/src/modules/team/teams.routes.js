const express = require('express')
const authMiddleware = require('../../middleware/authMiddleware')
const checkRoleMiddleware = require('../../middleware/checkRoleMiddleware')
const teamController = require('./teams.controller')

const router = express.Router()

router.use(authMiddleware)

// Define team-related routes here

router.post('/workspaces/:workspaceId/teams', checkRoleMiddleware("owner", "admin"), teamController.createTeam);
router.get('/workspaces/:workspaceId/teams', checkRoleMiddleware("owner", "admin", "member", "viewer"), teamController.getTeamsByWorkspace);
router.get('/teams/:teamId', checkRoleMiddleware("owner", "admin", "member", "viewer"), teamController.getTeamById);
router.patch('/teams/:teamId', checkRoleMiddleware("owner", "admin"), teamController.updateTeam);
router.delete('/teams/:teamId', checkRoleMiddleware("owner", "admin"), teamController.deleteTeam);

// Team member management routes
router.post('/teams/:teamId/members', checkRoleMiddleware("owner", "admin"), teamController.addTeamMember);
router.delete('/teams/:teamId/members/:memberId', checkRoleMiddleware("owner", "admin"), teamController.removeTeamMember);
router.patch('/teams/:teamId/members/:memberId/role', checkRoleMiddleware("owner", "admin"), teamController.updateTeamMemberRole);


module.exports = router