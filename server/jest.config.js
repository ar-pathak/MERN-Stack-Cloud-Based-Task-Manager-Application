module.exports = {
    testEnvironment: "node",
    testMatch: ["**/test/**/*.test.js"],
    setupFilesAfterEnv: ["<rootDir>/test/jest.setup.js"],
    testTimeout: 60000
};
