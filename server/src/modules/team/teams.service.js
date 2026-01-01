const mongoose = require('mongoose');
const Team = require('../../models/team');

const teamsService = {
    createTeam: async ({ name, description, workspaceId, userId }) => {
        const result = await Team.create({ name, description, workspace: workspaceId, createdBy: userId })
        return result;
    },
    getTeamsByWorkspace: async (workspaceId) => {
        const teams = await Team.find({ workspace: workspaceId });
        if (!teams) {
            throw new Error('No teams found for this workspace');
        }
        return teams;
    },
    getTeamById: async (teamId) => {
        const team = await Team.findById(teamId);
        if (!team) {
            throw new Error('Team not found');
        }
        return team;
    },
    updateTeam: async (teamId, updateData) => {
        const team = await Team.findByIdAndUpdate(teamId, updateData, { new: true });
        if (!team) {
            throw new Error('Team not found');
        }
        return team;
    },
    deleteTeam: async (teamId) => {
        const team = await Team.findByIdAndDelete(teamId);
        if (!team) {
            throw new Error('Team not found');
        }
        return team;
    },
    addTeamMember: async (teamId, { memberId, role }) => {
        const team = await Team.findById(teamId);
        if (!team) {
            throw new Error('Team not found');
        }
        if (!mongoose.Types.ObjectId.isValid(memberId)) {
            throw new Error("Invalid Member ID");
        }
        // Check if member already exists
        const existingMember = team.members.find(m => m.user.toString() === memberId);
        if (existingMember) {
            throw new Error('Member already in team');
        }

        team.members.push({ user: memberId, role });
        await team.save();
        return team;
    },
    getTeamMembers: async (teamId) => {
        const team = await Team.findById(teamId).populate('members.user', 'name email');
        if (!team) {
            throw new Error('Team not found');
        }
        return team.members;
    },
    removeTeamMember: async (teamId, memberId) => {
        const team = await Team.findById(teamId);
        if (!team) {
            throw new Error('Team not found');
        }
        const memberIndex = team.members.findIndex(m => m.user.toString() === memberId);
        if (memberIndex === -1) {
            throw new Error('Member not found in team');
        }
        team.members.splice(memberIndex, 1);
        await team.save();
        return team;
    },
    updateTeamMemberRole: async (teamId, memberId, role) => {
        const team = await Team.findById(teamId);
        if (!team) {
            throw new Error('Team not found');
        }
        const member = team.members.find(m => m.user.toString() === memberId);
        if (!member) {
            throw new Error('Member not found in team');
        }
        // Check if member have already the role 
        const memberRole = member.role;
        if (memberRole === role) {
            throw new Error('Member already has the specified role');
        }
        member.role = role;
        await team.save();
        return team;
    }
}

module.exports = teamsService;