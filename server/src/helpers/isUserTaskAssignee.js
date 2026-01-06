const Team = require('../models/team')

const isUserTaskAssignee = async (task, userId) => {
    const userIdStr = userId.toString();

    // 1. Direct assignment
    const isDirectAssignee = task.assignees.some(
        id => id.toString() === userIdStr
    );

    if (isDirectAssignee) return true;

    // 2. Team-based assignment
    const teamMatch = await Team.exists({
        _id: { $in: task.assigneesTeams },
        "members.user": userId
    });

    return Boolean(teamMatch);
};
module.exports = isUserTaskAssignee;