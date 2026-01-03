const Project = require('../../models/project');

const projectService = {
    createProject: async ({ data, workspaceId, userId }) => {
        const existingProject = await Project.findOne({
            name: data.name,
            workspace: workspaceId
        });

        if (existingProject) {
            throw new Error(
                "Project with the same name already exists in this workspace"
            );
        }

        const project = await Project.create({
            ...data,
            workspace: workspaceId,
            owner: userId,
            members: data.members?.length
                ? data.members
                : [{ user: userId, role: "admin" }]
        });

        return project;
    },
    getProjectsByWorkspace: async (workspaceId) => {
        const project = await Project.find({ workspace: workspaceId });
        if (!project) {
            throw new Error('Project not found in this workspace')
        }
        return project;
    },
    getProjectById: async (projectId) => {
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found')
        }
        return project;
    },
    updateProject: async (projectId, updateData) => {
        const project = await Project.findByIdAndUpdate(projectId, updateData, { new: true })
        if (!project) {
            throw new Error('Project not found')
        }
        return project;
    },
    deleteProject: async (projectId) => {
        const project = await Project.findByIdAndDelete(projectId);
        if (!project) {
            throw new Error('Project not found')
        }
        return project;
    },
    getProjectTeams: async (projectId) => {
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found')
        }
        return project.teams;
    },
    addProjectTeams: async (projectId, { teams }) => {
        const project = await Project.findByIdAndUpdate(
            projectId,
            {
                $addToSet: {
                    teams: { $each: teams }
                }
            },
            { new: true }
        );

        if (!project) {
            throw new Error("Project not found");
        }

        return { message: "Teams added to project" };
    },
    removeProjectTeams: async (projectId, { teams }) => {
        const project = await Project.findByIdAndUpdate(
            projectId,
            {
                $pull: {
                    teams: { $in: teams }
                }
            },
            { new: true }
        );

        if (!project) {
            throw new Error("Project not found");
        }

        return { message: "Teams removed from project" };
    },
    getProjectMembers: async (projectId) => {
        const project = await Project.findById(projectId)
        if (!project) {
            throw new Error('Project not found')
        }
        return project.members
    },
    addProjectMembers: async (projectId, { members }) => {
        const project = await Project.findByIdAndUpdate(
            projectId,
            {
                $addToSet: {
                    members: { $each: members }
                }
            },
            { new: true }
        );

        if (!project) {
            throw new Error("Project not found");
        }

        return { message: "Members added to project" };
    },
    removeProjectMembers: async (projectId, { users }) => {
        const project = await Project.findByIdAndUpdate(
            projectId,
            {
                $pull: {
                    members: { user: { $in: users } }
                }
            },
            { new: true }
        );

        if (!project) {
            throw new Error("Project not found");
        }

        return { message: "Members removed from project" };
    }
}

module.exports = projectService;