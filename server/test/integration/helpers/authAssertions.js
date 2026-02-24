const assert = require("node:assert/strict");

const expectUserAuthRequired = ({ response, body }) => {
    assert.equal(response.status, 401);
    assert.equal(body?.success, false);
    assert.equal(body?.message, "Authentication required. No token provided.");
};

const expectAdminAuthRequired = ({ response, body }) => {
    assert.equal(response.status, 401);
    assert.equal(body?.success, false);
    assert.equal(body?.message, "Admin authentication required");
    assert.equal(body?.code, "ADMIN_AUTH_REQUIRED");
};

module.exports = {
    expectUserAuthRequired,
    expectAdminAuthRequired
};
