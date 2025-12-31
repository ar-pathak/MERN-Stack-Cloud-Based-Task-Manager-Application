const express = require('express');
const workspaceController = require('./workspace.controller');
const authMiddleware = require('../../middleware/authMiddleware');
const checkRole = require('../../middleware/checkRoleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/createWorkspaces', workspaceController.createWorkspace);
router.get('/getAllWorkspaces', workspaceController.getAllWorkspaces);
router.get('/getWorkspaces/:id', workspaceController.getWorkspaceById);
router.patch('/updateWorkspace/:id', workspaceController.updateWorkspace);
router.delete('/deleteWorkspace/:id', workspaceController.deleteWorkspace);

// Member management routes
router.post("/:workspaceId/members", checkRole("owner", "admin"), workspaceController.addMember);
router.get('/:workspaceId/members', checkRole("owner", "admin", "member", "viewer"), workspaceController.getMembers);
router.delete('/:workspaceId/members/:memberId', checkRole("owner", "admin"), workspaceController.removeMember);
router.patch('/:workspaceId/members/:memberId/role', checkRole("owner", "admin"), workspaceController.updateMemberRole);

// Invite management routes
router.post('/:workspaceId/invites', checkRole("owner", "admin"), workspaceController.sendInvite);
router.post('/invites/accept/:token', workspaceController.acceptInvite);


module.exports = router;