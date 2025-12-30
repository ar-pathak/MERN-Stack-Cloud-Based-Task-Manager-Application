const express = require('express');
const workspaceController = require('./workspace.controller');
const authMiddleware = require('../../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/createWorkspaces', workspaceController.createWorkspace);
router.get('/getAllWorkspaces', workspaceController.getAllWorkspaces);
router.get('/getWorkspaces/:id', workspaceController.getWorkspaceById);
router.patch('/updateWorkspace/:id', workspaceController.updateWorkspace);
router.delete('/deleteWorkspace/:id', workspaceController.deleteWorkspace);


module.exports = router;