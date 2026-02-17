const mongoose = require('mongoose');
const WorkspaceMember = require('../models/workspaceMember');

const { canCreateTask } = require('./resolveTaskCreatePermission');

const checkWorkspaceMemberRole = (...allowedRoles) => {
  try {
    return async (req, res, next) => {
      const member = await WorkspaceMember.findOne({
        workspace: req.params.workspaceId,
        user: req.user._id
      });

      if (!member || !allowedRoles.includes(member.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    };
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};


const checkCanCreateTask = () => {
  return async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { workspaceId, projectId, teamId } = req.params;

      // 🔒 Mandatory
      if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        return res.status(400).json({ message: "Invalid workspaceId" });
      }

      // 🔒 Optional params (validate only if present)
      if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ message: "Invalid projectId" });
      }

      if (teamId && !mongoose.Types.ObjectId.isValid(teamId)) {
        return res.status(400).json({ message: "Invalid teamId" });
      }

      const allowed = await canCreateTask({
        userId,
        workspaceId,
        projectId,
        teamId,
        enforceWorkspaceAdminOnly: !projectId,
        requireProjectAdminOrWorkspaceOwner: Boolean(projectId)
      });

      if (!allowed) {
        const message = projectId
          ? "Only project admins or workspace owners can create tasks in this project"
          : "Only workspace owners and admins can create tasks";

        return res.status(403).json({
          message
        });
      }

      next();
    } catch (error) {
      next(error); // centralized error handler
    }
  };
};




module.exports = { checkWorkspaceMemberRole, checkCanCreateTask };
