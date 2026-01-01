

const mongoose = require('mongoose');
const teamsService = require('./teams.service')
const { createTeamSchema, updateTeamSchema, addTeamMemberSchema, updateTeamMemberRoleSchema } = require('./teams.validation')

const teamController = {
    createTeam: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                throw new Error("Invalid workspace ID");
            }
            const { name, description } = createTeamSchema.parse(req.body)
            const result = await teamsService.createTeam({ name, description, workspaceId, userId: req.user._id });
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    getTeamsByWorkspace: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                throw new Error("Invalid Workspace ID");
            }
            const team = await teamsService.getTeamsByWorkspace(workspaceId);
            res.status(200).json(team);
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    getTeamById: async (req, res) => {
        try {
            const { teamId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                throw new Error("Invalid Team ID");
            }
            const team = await teamsService.getTeamById(teamId);
            res.status(200).json(team);
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    updateTeam: async (req, res) => {
        try {
            const { teamId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                throw new Error("Invalid Team ID");
            }
            const data = updateTeamSchema.parse(req.body);
            const updatedTeam = await teamsService.updateTeam(teamId, data);

            res.status(201).json(updatedTeam);

        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    deleteTeam: async (req, res) => {
        try {
            const { teamId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                throw new Error("Invalid Team ID");
            }
            await teamsService.deleteTeam(teamId);
            res.status(200).json({ message: "Team deleted successfully" });
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    addTeamMember: async (req, res) => {
        try {
            const { teamId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                throw new Error("Invalid Team ID");
            }
            const data = addTeamMemberSchema.parse(req.body);
            const newMember = await teamsService.addTeamMember(teamId, data);
            res.status(201).json(newMember);
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    }, getTeamMembers: async (req, res) => {
        try {
            const { teamId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                throw new Error("Invalid Team ID");
            }
            const teamMembers = await teamsService.getTeamMembers(teamId);
            res.status(200).json(teamMembers);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    removeTeamMember: async (req, res) => {
        try {
            const { teamId, memberId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                throw new Error('Invalid Team ID');
            }
            if (!mongoose.Types.ObjectId.isValid(memberId)) {
                throw new Error('Invalid Member ID');
            }
            const result = await teamsService.removeTeamMember(teamId, memberId);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    updateTeamMemberRole: async (req, res) => {
        try {
            const { teamId, memberId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                throw new Error('Invalid Team ID');
            }
            if (!mongoose.Types.ObjectId.isValid(memberId)) {
                throw new Error('Invalid Member ID');
            }
            const data = updateTeamMemberRoleSchema.parse(req.body);
            const team = await teamsService.updateTeamMemberRole(teamId, memberId, data.role);
            res.status(200).json(team);
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },

}

module.exports = teamController;