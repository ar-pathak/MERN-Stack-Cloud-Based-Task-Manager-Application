

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
            res.send("getTeamsByWorkspace")
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    getTeamById: async (req, res) => {
        try {
            res.send("get team by id")
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    updateTeam: async (req, res) => {
        try {
            res.send("updateTeam")
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    deleteTeam: async (req, res) => {
        try {
            res.send("delete team")
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    addTeamMember: async (req, res) => {
        try {
            res.send("add team member")
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    removeTeamMember: async (req, res) => {
        try {
            res.send('remove team member')
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    updateTeamMemberRole: async (req, res) => {
        try {
            res.send('update team member role')
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    }
}

module.exports = teamController;