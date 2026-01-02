const Project = require('../../models/project');

const projectService = {
    createProject: async (projectData) => {
        // Check if project with the same name exists in the workspace
        const existingProject = await Project.findOne({
            name: projectData.name,
            workspace: projectData.workspaceId
        })
        if (existingProject) {
            throw new Error('Project with the same name already exists in this workspace');
        }
        
        // Logic to create a project in the database
        const project = Project.create(projectData);
        return project;
    }
}

module.exports = projectService;