const Team = require('../../models/team');

const teamsService = {
    createTeam: async ({ name, description, workspaceId, userId }) => {
        const result = await Team.create({ name, description, workspace: workspaceId, createdBy: userId })
        return result;
    }
}

module.exports = teamsService;