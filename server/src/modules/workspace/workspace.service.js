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
    getAllWorkspaces: async () => {
        //logic to get all workspaces
    },
    getWorkspaceById: async (id) => {
        //logic to get a workspace by id
    },
    updateWorkspace: async (id, data) => {
        //logic to update a workspace
    },
    deleteWorkspace: async (id) => {
        //logic to delete a workspace
    }
}

module.exports = workspaceService