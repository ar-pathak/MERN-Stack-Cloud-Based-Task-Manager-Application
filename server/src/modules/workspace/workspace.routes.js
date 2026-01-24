const express = require('express');
const workspaceController = require('./workspace.controller');
const authMiddleware = require('../../middleware/authMiddleware');
const { checkWorkspaceMemberRole } = require('../../middleware/checkRoleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Workspace CRUD
router.post('/createWorkspaces', workspaceController.createWorkspace);
router.get('/getAllWorkspaces', workspaceController.getAllWorkspaces);
router.get('/getWorkspaces/:id', workspaceController.getWorkspaceById);
router.patch('/updateWorkspace/:id', workspaceController.updateWorkspace);
router.delete('/deleteWorkspace/:id', workspaceController.deleteWorkspace);

// Member management routes
router.post("/:workspaceId/members", checkWorkspaceMemberRole("owner", "admin"), workspaceController.addMember);
router.get('/:workspaceId/members', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), workspaceController.getMembers);
router.delete('/:workspaceId/members/:memberId', checkWorkspaceMemberRole("owner", "admin"), workspaceController.removeMember);
router.patch('/:workspaceId/members/:memberId/role', checkWorkspaceMemberRole("owner", "admin"), workspaceController.updateMemberRole);

// Invite management routes
router.post('/:workspaceId/invites', checkWorkspaceMemberRole("owner", "admin"), workspaceController.sendInvite);
router.post('/invites/accept/:token', workspaceController.acceptInvite);

// Workspace actions
router.post('/:workspaceId/leave', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), workspaceController.leaveWorkspace);
router.post('/:workspaceId/transfer-ownership', checkWorkspaceMemberRole("owner"), workspaceController.transferOwnership);

// Quick Actions (Star, Mute, Archive)
router.patch('/:workspaceId/star', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), workspaceController.toggleStar);
router.patch('/:workspaceId/mute', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), workspaceController.toggleMute);
router.patch('/:workspaceId/archive', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), workspaceController.toggleArchive);


module.exports = router;