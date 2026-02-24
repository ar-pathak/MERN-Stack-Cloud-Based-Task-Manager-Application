const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const serverRoot = path.resolve(__dirname, "../../..");
const defaultEnvPath = path.join(serverRoot, ".env");
const testEnvPath = path.join(serverRoot, ".env.test");

dotenv.config({ path: defaultEnvPath });

if (fs.existsSync(testEnvPath)) {
    dotenv.config({ path: testEnvPath, override: true });
}
