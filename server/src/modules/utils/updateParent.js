const Workspace = require('../../models/workspace');
const Project = require('../../models/project');


const touchParents = async (task) => {
  // If task belongs to a project
  if (task.project) {
    await Project.findByIdAndUpdate(task.project, {
      $set: { updatedAt: new Date() }
    });
  }
  // Else if task belongs directly to workspace
  else if (task.workspace) {
    await Workspace.findByIdAndUpdate(task.workspace, {
      $set: { updatedAt: new Date() }
    });
  }
};

const touchWorkspace = async (workspaceId) => {
  await Workspace.findByIdAndUpdate(workspaceId, {
    $set: { updatedAt: new Date() }
  });
};

module.exports = { touchParents, touchWorkspace }