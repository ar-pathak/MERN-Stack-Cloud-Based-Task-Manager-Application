const WorkspaceMember = require('../models/workspaceMember');

const checkRole = (...allowedRoles) => {
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
    res.status(400).json({ error: error.message })
  }
};

module.exports = checkRole;
