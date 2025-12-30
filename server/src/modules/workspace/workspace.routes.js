const express = require('express');
const workspaceController = require('./workspace.controller');
const authMiddleware = require('../../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/createWorkspaces', workspaceController.createWorkspace);
router.get('/workspaces', workspaceController.getAllWorkspaces);
router.get('/workspaces/:id', workspaceController.getWorkspaceById);
router.patch('/workspaces/:id', workspaceController.updateWorkspace);
router.delete('/workspaces/:id', workspaceController.deleteWorkspace);


module.exports = router;