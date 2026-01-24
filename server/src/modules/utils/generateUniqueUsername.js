const User = require('../../models/user')


const generateUniqueUsername = async (email) => {
    // 1. Get base name from email (before @)
    let baseUsername = email.split('@')[0].toLowerCase();

    // 2. Clean it: remove special chars to match regex /^[a-z0-9_]{3,20}$/
    baseUsername = baseUsername.replace(/[^a-z0-9_]/g, "");

    // 3. Ensure minimum length of 3 (pad if necessary)
    if (baseUsername.length < 3) {
        baseUsername = baseUsername + Math.floor(Math.random() * 1000);
    }

    // 4. Truncate to max 15 to leave room for random numbers (max is 20)
    if (baseUsername.length > 15) {
        baseUsername = baseUsername.substring(0, 15);
    }

    let username = baseUsername;
    let isUnique = false;

    // 5. Loop until a unique username is found
    while (!isUnique) {
        const existingUser = await User.findOne({ username });
        if (!existingUser) {
            isUnique = true;
        } else {
            // Append a random 4-digit number
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            username = `${baseUsername}${randomSuffix}`;
        }
    }

    return username;
};
module.exports = generateUniqueUsername