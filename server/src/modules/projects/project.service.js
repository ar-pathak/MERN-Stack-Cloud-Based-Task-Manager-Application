const Project = require('../../models/project');
const { touchWorkspace } = require('../utils/updateParent');

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
        await touchWorkspace(workspaceId);
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
        await touchWorkspace(project.workspace);
        return project;
    },
    deleteProject: async (projectId) => {
        const project = await Project.findByIdAndDelete(projectId);
        if (!project) {
            throw new Error('Project not found')
        }
        await touchWorkspace(project.workspace);
        return project;
    },
    getProjectTeams: async (projectId) => {
        const project = await Project.findById(projectId).populate('teams');
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
            .populate('members.user', 'name email');

        if (!project) {
            throw new Error('Project not found');
        }

        return project.members;
    },
    addProjectMembers: async (projectId, { members }) => {
        const project = await Project.findById(projectId).select('members');

        if (!project) {
            throw new Error("Project not found");
        }

        const existingUserIds = new Set(project.members.map(m => m.user.toString()));

        const newMembers = members.filter(m => !existingUserIds.has(m.user.toString()));

        if (newMembers.length === 0) {
            return { message: "All selected members are already in the project" };
        }

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            {
                $push: {
                    members: { $each: newMembers }
                }
            },
            { new: true }
        );

        return { message: `${newMembers.length} new members added successfully` };
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
    }, 
    updateProjectMemberRole: async (projectId, memberId, role) => {
        const project = await Project.findOneAndUpdate(
            {
                _id: projectId,
                "members.user": memberId
            },
            {
                $set: { "members.$.role": role }
            },
            { new: true }
        );

        if (!project) {
            throw new Error("Project not found or user is not a member of this project");
        }

        return { message: "Member role updated successfully" };
    },
    leaveProject: async (projectId, userId) => {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error("Project not found");
        }

        // 1. Check if user is the owner
        if (project.owner.toString() === userId.toString()) {
            throw new Error("Project owner cannot leave the project. You must transfer ownership or delete the project.");
        }

        // 2. Check if user is actually a member
        const isMember = project.members.some(m => m.user.toString() === userId.toString());
        if (!isMember) {
            throw new Error("You are not a member of this project");
        }

        // 3. Remove user from members array
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            {
                $pull: {
                    members: { user: userId }
                }
            },
            { new: true }
        );

        return { message: "You have left the project successfully" };
    },
}

module.exports = projectService;