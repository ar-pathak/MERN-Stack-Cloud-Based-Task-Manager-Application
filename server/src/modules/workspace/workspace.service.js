const Workspace = require('../../models/workspace')
const WorkspaceMember = require('../../models/workspaceMember')

const workspaceService = {
    createWorkspace: async ({ name, description, ownerId }) => {
        const workspace = await Workspace.create({
            name,
            description,
            createdBy: ownerId
        });

        // Auto-add creator as OWNER
        await WorkspaceMember.create({
            workspace: workspace._id,
            user: ownerId,
            role: "owner"
        });

        return workspace;
    }
    ,
    getAllWorkspaces: async (userId) => {
        //logic to get all workspaces
        const workspaces = await WorkspaceMember.find({ user: userId }).populate('workspace');
        if (!workspaces) {
            throw new Error('No workspaces found for this user');
        }
        return workspaces.map(wm => wm.workspace);

    },
    getWorkspaceById: async (id) => {
        //logic to get a workspace by id
        const workspace = await Workspace.findById(id);
        if (!workspace) {
            throw new Error('Workspace not found');
        }
        return workspace;
    },
    updateWorkspace: async (id, data) => {
        //logic to update a workspace
        const updatedWorkspace = await Workspace.findByIdAndUpdate(id, data, { new: true });
        if (!updatedWorkspace) {
            throw new Error('Workspace not found or update failed');
        }
        return updatedWorkspace;
    },
    deleteWorkspace: async (id) => {
        //logic to delete a workspace
        const deletedWorkspace = await Workspace.findByIdAndDelete(id);
        if (!deletedWorkspace) {
            throw new Error('Workspace not found or delete failed');
        }
    }
}

module.exports = workspaceService