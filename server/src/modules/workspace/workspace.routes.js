const express = require('express');
const multer = require('multer');
const workspaceController = require('./workspace.controller');
const authMiddleware = require('../../middleware/authMiddleware');
const { checkWorkspaceMemberRole } = require('../../middleware/checkRoleMiddleware');

const router = express.Router();
const inviteCsvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const fileName = String(file?.originalname || "").toLowerCase();
        const mimeType = String(file?.mimetype || "").toLowerCase();
        const isCsv = fileName.endsWith(".csv")
            || mimeType.includes("csv")
            || mimeType === "application/vnd.ms-excel";

        if (!isCsv) {
            const error = new Error("Only CSV files are allowed");
            error.statusCode = 400;
            error.status = 400;
            return cb(error);
        }

        cb(null, true);
    }
});

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
router.post(
    '/:workspaceId/invites',
    checkWorkspaceMemberRole("owner", "admin"),
    inviteCsvUpload.single("emailsFile"),
    workspaceController.sendInvite
);
router.post('/invites/accept/:token', workspaceController.acceptInvite);
router.post('/invites/:inviteId/respond', workspaceController.respondInvite);

// Workspace actions
router.post('/:workspaceId/leave', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), workspaceController.leaveWorkspace);
router.post('/:workspaceId/transfer-ownership', checkWorkspaceMemberRole("owner"), workspaceController.transferOwnership);

// Quick Actions (Star, Mute, Archive)
router.get('/:workspaceId/quick-status', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), workspaceController.getQuickStatus);
router.patch('/:workspaceId/star', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), workspaceController.toggleStar);
router.patch('/:workspaceId/mute', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), workspaceController.toggleMute);
router.patch('/:workspaceId/archive', checkWorkspaceMemberRole("owner", "admin", "member", "viewer"), workspaceController.toggleArchive);


module.exports = router;
